//
//  AAPlayer class encapsulates MIDI playing functions from all sources and
//  corrects any errors in MIDI lilbrary-- for example, ensures that we use the
//  correct, available input sources and so forth.
//

import MIDI from 'midi_drums';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

class AAPlayerClass {

    constructor () {
        let thisObject = this;
        // MIDI related constants
        thisObject.MIDI_DRUM_CHANNEL = 9;
        thisObject.MIDI_DEFAULT_KEYBOARD_CHANNEL = 0;
        // Hooks for other routines listening to MIDI messages
        thisObject.onmidideviceinput = null;
            // ^ If thisObject is a function, it gets called as soon as an EXTERNAL midi message comes in.
            // The message is passed.  If the function returns false, the regular midi processing
            // and playing is NOT done (the midi input handler just returns).  If the function
            // returns true, the regular midi input handler is also run (leading to playing, recording,
            // etc.)

        // Internal state

        // Support routines for input processing, recording and routing
        thisObject.handleMIDIDeviceInput = function (message) {
            //console.log(message.target.id +": " + JSON.stringify(message.data));; // debugging
            // -- if callers have set up custom midi handler, run it now 
            if (thisObject.onmidideviceinput) {
                let r = thisObject.onmidideviceinput(message);
                if (!r) return;  // if false return value, we don't process the message normally
            }

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
            let internalFound = false;
            if (!thisObject.supportsMIDI()) internalFound = true;
            else {
                for (let i = 0; i < MIDI.WebMIDI.outputList.length; i++) {
                    if (MIDI.WebMIDI.outputList[i].id === "internal") internalFound = true;
                }
            }
            if (internalFound) {
                thisObject.loadPlugin({setupMIDI: false, instrument: programNumber, onsuccess: function()
                    {
                    thisObject.sendInputProgramChange(myChannel, programNumber, myInputSource);
                    }
                });
            }
            else 
                thisObject.sendInputProgramChange(myChannel, programNumber, myInputSource);
        }

        // Hooks for input methods, typically, just used by the screen keyboards.
        // Separate from note events so that they can record & other cool things.
        thisObject.sendInputPassthrough = function(data, inputSource = "internal") {
            // Used for sending a passthrough Midi message that isn't being interpreted.  Exists as
            // a place to attach, for example, recording calls to ensure all weird MIDI messages get
            // recorded.

            //-- send the message through Midi if it is enabled
            if (thisObject.supportsMIDI()) MIDI.WebMIDI.send(data, 0);
        }

        thisObject.sendInputNoteOn = function(channel, noteNumber, velocity, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource != "internal") return;
            thisObject.noteOn(channel, noteNumber, velocity, 0);
        }
        thisObject.sendInputNoteOff = function(channel, noteNumber, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource != "internal") return;
            thisObject.noteOff(channel, noteNumber, 0);
        }
        thisObject.sendInputProgramChange = function(channel, instrument, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource != "internal") return;
            thisObject.programChange(channel, instrument);
        }
        thisObject.sendInputPitchBend = function(channel, bend, inputSource = "internal") {
            if (!SettingsStorage.getSetting("playNotesFromMIDI") && inputSource != "internal") return;
            thisObject.pitchBend(channel, bend);
        }

        // Get various properties from the underlying MIDI interface.
        thisObject.drumNames = function() {
            return MIDI.GM.drumByNote;
        }

        thisObject.byId = function() {
            return MIDI.GM.byId;
        }

        thisObject.channels = function() {
            return MIDI.channels;
        }

        thisObject.supportsMIDI = function() {
            return MIDI.supports["webmidi"];
        }

        thisObject.noteToKey = function(n) {
            if (MIDI.noteToKey[n]) return MIDI.noteToKey[n];
            else return "Unset";
        }

        thisObject.keyToNote = function(k) {
            if (MIDI.keyToNote[k]) return MIDI.keyToNote[k];
            else return 0;
        }

        thisObject.refreshInputs = function() { return MIDI.WebMIDI.refreshInputs(); }
        thisObject.refreshOutputs = function() { return MIDI.WebMIDI.refreshOutputs(); }
        thisObject.setInput = function(x) {
            MIDI.WebMIDI.setInput(x); 
            MIDI.WebMIDI.onmidimessage = function(message) {
                thisObject.handleMIDIDeviceInput(message);
            }
        }
        thisObject.setOutput = function(x) { return MIDI.WebMIDI.setOutput(x); } 

        // Ouput Methods similar to those in the MIDI library, but often changed to output to
        // the desired MIDI port or to the web MIDI library's simulator (and to handle drums):
        thisObject.setMasterVolume = function(x) {
            MIDI.masterVolume = x;
        }
        thisObject.stopAllNotes = function() {
            try { MIDI.stopAllNotes(); } catch(e) { }
            try { if (thisObject.supportsMIDI()) MIDI.WebMIDI.stopAllNotes(); } catch(e) { }
        }
        thisObject.programChange = function(channel, instrument) {
            if (thisObject.supportsMIDI() && instrument < 128)  
            //-- notice: when loading, drums (special code 128) might be sent; this should NOT be sent
            //-- as an actual MIDI message to devices-- just send it to WebAudio which understands.
                MIDI.WebMIDI.programChange(channel, instrument);
            else
                MIDI.programChange(channel, instrument);
        }
        thisObject.pitchBend = function(channel, bend) {
            if (thisObject.supportsMIDI())
                MIDI.WebMIDI.pitchBend(channel, bend);
            else
                MIDI.pitchBend(channel, bend);
        }
        thisObject.loadPlugin = function(obj) {
            let callerSuccess = obj.onsuccess;
            obj.onsuccess = function() {
                if (thisObject.supportsMIDI()) {
                    // initialize WebMIDI before calling the user's success function, if you can.
                    if (obj.setupMIDI) {
                        thisObject.refreshInputs();
                        thisObject.refreshOutputs();
                        thisObject.setInput(["internal"]);
                        thisObject.setOutput(["internal"]);
                        SettingsStorage.putSetting("currentInput", ["internal"]);
                        SettingsStorage.putSetting("currentOutput", ["internal"]);
                    }
                }
                if (obj.initialSetup) {
                    // make sure to set all channels to program 0 (except drums) at start!
                    for (let i = 0; i < 16; i++) {
                        if (i === 9) thisObject.programChange(i,128);
                        else thisObject.programChange(i,0);
                    }
                }
                callerSuccess();
            }
            MIDI.loadPlugin(obj);
        }
        thisObject.noteOn = function(channel, noteNumber, velocity, delay) {
            if (thisObject.supportsMIDI()) 
                MIDI.WebMIDI.noteOn(channel, noteNumber, velocity, delay);
            else
                MIDI.noteOn(channel, noteNumber, velocity, delay);
        }
        thisObject.noteOff = function(channel, noteNumber, delay) {
            if (thisObject.supportsMIDI())
                MIDI.WebMIDI.noteOff(channel, noteNumber, delay);
            else
                MIDI.noteOff(channel, noteNumber, delay);
        }
        thisObject.chordOn = function(channel, noteNumbers, velocity, delay) {
            // my chord routines just call the note routines, so new features they have, like
            // new output sources or recording notes, will only have to be done in one place.
            for (let noteNumber of noteNumbers) thisObject.noteOn(channel, noteNumber, velocity, delay);
        }
        thisObject.chordOff = function(channel, noteNumbers, delay) {
            for (let noteNumber of noteNumbers) thisObject.noteOff(channel, noteNumber, delay);
        }



    }
}

export let AAPlayer = new AAPlayerClass();
