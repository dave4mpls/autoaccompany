//
//  AAPlayer class encapsulates MIDI playing functions from all sources.
//  It handles the connections to the low-level synthesizer and such.
//

import { Synth } from './tinysynth.js';  // 8/29/18: Substituted my improved tinysynth for midi.js npm module, bringing everything into one repository with improved audio!
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { EventHandler } from '../EventHandler.js';

class AAPlayerClass {

    constructor () {
        let thisObject = this;
        // MIDI related constants
        thisObject.MIDI_DRUM_CHANNEL = 9;
        thisObject.MIDI_DEFAULT_KEYBOARD_CHANNEL = 0;
        // Hooks for other routines listening to MIDI messages
        this.preventDefaultFlag = false;
        thisObject.events = new EventHandler();
        thisObject.events.addEventMethods(thisObject, thisObject.events);
            // Events:
            // onMidiDeviceInput: it gets called as soon as an EXTERNAL midi message comes in.
            // The message is passed.  If the function returns false, the regular midi processing
            // and playing is NOT done (the midi input handler just returns).  If the function
            // returns true, the regular midi input handler is also run (leading to playing, recording,
            // etc.)
            // onInputNoteOn: it gets called when a screen keyboard key is pressed
            // onInputNoteOff: it gets called when a screen keyboard key is released

        // Internal state

        // Recording and playback: main buttons
        

        // Support routines for input processing, recording and routing
        thisObject.handleMIDIDeviceInput = function (message) {
            //console.log(message.target.id +": " + JSON.stringify(message.data));; // debugging
            // -- if callers have set up custom midi handler, run it now 
            let r = thisObject.fireEvent("onMidiDeviceInput", message);
            if (r) return;      // this handles the prevent default option

            // -- now: regular midi device input handling
            let data = message.data;
            let midiCommand = message.data[0] & 0xF0;
            let myChannel = message.data[0] & 0x0F;
            let myInputSource = message.target.id;
            switch (midiCommand) {
                case 0x80: thisObject.sendInputNoteOff(myChannel, data[1], myInputSource); break;
                case 0x90:
                    // -- note on: apply min/max velocity settings, useful for velocity-sensitive
                    // -- keyboards when you want less dynamic range
                    let velocity = data[2];
                    if (velocity < SettingsStorage.getSetting("minVelocity"))
                        velocity = SettingsStorage.getSetting("minVelocity");
                    if (velocity > SettingsStorage.getSetting("maxVelocity"))
                        velocity = SettingsStorage.getSetting("maxVelocity"); 
                    thisObject.sendInputNoteOn(myChannel, data[1], velocity, myInputSource); break;
                case 0x00: 
                    if (thisObject.supportsMIDI()) thisObject.sendInputPassthrough(data, myInputSource);
                    break;  // pass-through set controller
                case 0xB0:
                    if (data[1] === 0x7B) thisObject.stopAllNotes();   // do send stop-all-notes message
                    else {
                        //-- pass through all other messages
                        if (thisObject.supportsMIDI()) thisObject.sendInputPassthrough(data, myInputSource);
                    }
                    break;  
                case 0xC0: 
                    // If internal synth is selected as output, we have to make sure the
                    // instrument is loaded before we can do program change!
                    // TODO: make it so thisObject doesn't throw off rhythm during playing
                    thisObject.sendInputProgramChangeWithInstrumentLoad(myChannel, data[1], myInputSource);
                    break;
                case 0xE0: 
                    thisObject.sendInputPitchBend(myChannel, data[1] + (data[2]<<7), myInputSource); 
                    break;
                default:
                    if (thisObject.supportsMIDI()) thisObject.sendInputPassthrough(data, myInputSource);
                    break;  // pass through all other messages
            }
        }

        thisObject.sendInputProgramChangeWithInstrumentLoad = function(myChannel, programNumber, myInputSource) {
            //--- this routine just passes through now that we have the new synthesizer, which 
            thisObject.sendInputProgramChange(myChannel,programNumber,myInputSource);
        }

        // Hooks for input methods, typically, just used by the screen keyboards.
        // Separate from note events so that they can record & other cool things.
        thisObject.sendInputPassthrough = function(data, inputSource = "internal") {
            // Used for sending a passthrough Midi message that isn't being interpreted.  Exists as
            // a place to attach, for example, recording calls to ensure all weird MIDI messages get
            // recorded.

            //-- send the message through Midi if it is enabled
            if (thisObject.supportsMIDI()) Synth.send(data, 0);
        }

        thisObject.sendInputNoteOn = function(channel, noteNumber, velocity, inputSource = "internal") {
            if (thisObject.fireEvent("onInputNoteOn",
                    {channel: channel, noteNumber: noteNumber, 
                    velocity: velocity, inputSource: inputSource}))
                return;
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource !== "internal") return;
            thisObject.noteOn(channel, noteNumber, velocity, 0);
        }
        thisObject.sendInputNoteOff = function(channel, noteNumber, inputSource = "internal") {
            if (thisObject.fireEvent("onInputNoteOff",
                    {channel: channel, noteNumber: noteNumber, 
                    inputSource: inputSource}))
                return;
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource !== "internal") return;
            thisObject.noteOff(channel, noteNumber);
        }
        thisObject.sendInputProgramChange = function(channel, instrument, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource !== "internal") return;
            thisObject.programChange(channel, instrument);
        }
        thisObject.sendInputPitchBend = function(channel, bend, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource !== "internal") return;
            thisObject.pitchBend(channel, bend);
        }

        // Get various properties from the underlying MIDI interface.
        thisObject.getDrumName = function(n) {
            return Synth.getTimbreName(1,n);
        }
        thisObject.byId = function() {
            var o = [ ];
            for (var i = 0; i < 128; i++) 
                o.push({number: i, instrument: Synth.getTimbreName(0,i)});
            return o;
        }

        thisObject.supportsMIDI = function() {
            return Synth.isMIDIEnabled();
        }

        thisObject.noteToKey = function(n) {
            var number2key = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
            if (!n || n < 0x15 || n > 0x6C) return "Unset";
            return number2key[n%12] + (((n-12)/12)>>0);
        }

        thisObject.keyToNote = function(k) {
            for (var n = 0x15; n <= 0x6C; n++) {
                var lk = thisObject.noteToKey(n); if (k===lk) return n;
            }
            return 0;
        }

        thisObject.refreshInputs = function() { return Synth.refreshInputs(); }
        thisObject.refreshOutputs = function() { return Synth.refreshOutputs(); }
        thisObject.setInput = function(x) {
            Synth.setInput(x); 
            Synth.onmidimessage = function(message) {
                thisObject.handleMIDIDeviceInput(message);
            }
        }
        thisObject.setOutput = function(x) { return Synth.setOutput(x); } 

        // Ouput Methods similar to those in the MIDI library, but often changed to output to
        // the desired MIDI port or to the web MIDI library's simulator (and to handle drums):
        thisObject.setMasterVolume = function(x) {
            Synth.setMasterVol(x);
        }
        thisObject.stopAllNotes = function() {
            Synth.allSoundOff();
        }
        thisObject.programChange = function(channel, instrument) {
            Synth.send([0xC0 + (channel & 0x0F),(instrument & 0x7F)]);
        }
        thisObject.send = function(channel, data, t) {
            // Send an arbitrary MIDI message only to external MIDI devices (used for messages not 
            // interpreted by internal synthesizer, so don't send note on/off, program change, or pitch bend
            // through here).
            data = data.slice(0);
            data[0] = ((data[0] & 0xF0) & (channel & 0x0F));
            data[0] &= 0xFF; data[1] &= 0x7F; 
            if (thisObject.supportsMIDI()) Synth.send(data, t); 
        }
        thisObject.pitchBend = function(channel, bend) {
            Synth.send([0xE0+(channel & 0x07),bend & 0x7F, bend >> 7]);
        }
        thisObject.loadPlugin = function(obj) {
            let callerSuccess = obj.onsuccess;
            if (obj.initialSetup) {     //-- extra stuff we do on initial startup
                //--- Synth is added to Window because looking at its properties
                //--- in the debugging window is highly helpful (part of why I like it better than the old sound module midijs).
                window.Synth = Synth;
                Synth.setSoundfontPath(obj.soundfontUrl);
                Synth.setQuality(2);        // We choose sampling quality to start.
                var afterInstrumentSetup = function() { // this part is called after MIDI setup
                    //-- whether the instruments were loaded correctly or not is now stored
                    //-- in the synth's "availableQualities" 
                    if (!Synth.availableQualities[2]) Synth.setQuality(1);  // fallback to FM synthesis if no samples available
                    if (Synth.isMIDIEnabled()) {
                        thisObject.refreshInputs();
                        thisObject.refreshOutputs();
                        thisObject.setInput(["internal"]);
                        thisObject.setOutput(["internal"]);
                        SettingsStorage.putSetting("currentInput", ["internal"]);
                        SettingsStorage.putSetting("currentOutput", ["internal"]);
                    }
                    if (callerSuccess) callerSuccess();
                }
                var afterMIDISetup = function() {   // set up this function we do after trying to set up MIDI hardware...
                    //-- note this gets called whether MIDI setup works or not.  now
                    //-- load the starting instruments...
                    try {
                        Synth.loadInstruments(obj.instrument, afterInstrumentSetup, afterInstrumentSetup, null);
                    } catch(e) { afterInstrumentSetup(); }
                };
                try {
                    Synth.setupMIDIDevices(afterMIDISetup,afterMIDISetup);
                } catch(e) { afterMIDISetup(); }
            } else {        //-- loadPlugin is also used to just load instruments-- it made more sense when our sound module was midijs, but we can make it work
                Synth.loadInstruments(obj.instrument, callerSuccess, callerSuccess);
            }
        }
        thisObject.currentTime = function() { return Synth.currentTime(); }
        thisObject.noteOn = function(channel, noteNumber, velocity, delay) {
            Synth.send([0x90 + (channel & 0x0F), noteNumber & 0x7F, velocity & 0x7F], delay);
        }
        thisObject.noteOff = function(channel, noteNumber, delay) {
            Synth.send([0x80 + (channel & 0x0F), noteNumber & 0x7F, 0], delay);
        }
        thisObject.chordOn = function(channel, noteNumbers, velocity, delay) {
            // my chord routines just call the note routines, so new features they have, like
            // new output sources or recording notes, will only have to be done in one place.
            for (let noteNumber of noteNumbers) thisObject.noteOn(channel, noteNumber, velocity, delay);
        }
        thisObject.chordOff = function(channel, noteNumbers, delay) {
            for (let noteNumber of noteNumbers) thisObject.noteOff(channel, noteNumber, delay);
        }

        thisObject.instrumentName = function(instrumentNumber) {
            return Synth.getTimbreName(0,instrumentNumber);
        }
    }
}

export let AAPlayer = new AAPlayerClass();
