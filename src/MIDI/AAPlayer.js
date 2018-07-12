//
//  AAPlayer class encapsulates MIDI playing functions from all sources and
//  corrects any errors in MIDI lilbrary-- for example, ensures that we use the
//  correct, available input sources and so forth.
//

import MIDI from 'midi_drums';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

export default class AAPlayer {
    // MIDI related constants
    static MIDI_DRUM_CHANNEL = 9;
    static MIDI_DEFAULT_KEYBOARD_CHANNEL = 0;

    // Internal state

    // Support routines for input processing, recording and routing
    static handleMIDIDeviceInput(message) {
        //console.log(message.target.id +": " + JSON.stringify(message.data));; // debugging
        let data = message.data;
        let midiCommand = message.data[0] & 0xF0;
        let myChannel = message.data[0] & 0x0F;
        let thisObject = this;
        switch (midiCommand) {
            case 0x80: this.sendInputNoteOff(myChannel, data[1], 0); break;
            case 0x90: this.sendInputNoteOn(myChannel, data[1], data[2], 0); break;
            case 0x00: break;  // ignore set controller
            case 0xB0:
              if (data[1] == 0x7B) this.stopAllNotes();   // do send stop-all-notes message
              break;  // ignore set volume
            case 0xC0: 
                // If internal synth is selected as output, we have to make sure the
                // instrument is loaded before we can do program change!
                // TODO: make it so this doesn't throw off rhythm during playing
                let internalFound = false;
                for (let i = 0; i < MIDI.WebMIDI.outputList.length; i++) {
                    if (MIDI.WebMIDI.outputList[i].id == "internal") internalFound = true;
                }
                if (internalFound) {
                    this.loadPlugin({setupMIDI: false, instrument: data[1], onsuccess: function()
                        {
                        thisObject.sendInputProgramChange(myChannel, data[1], 0);
                        }
                    });
                }
                else 
                    thisObject.sendInputProgramChange(myChannel, data[1], 0);
                break;
            case 0xE0: 
                this.sendInputPitchBend(myChannel, data[1] + (data[2]<<7)); 
                break;
            default: break;  // ignore all other MIDI messages
        }
    }

    // Hooks for input methods, typically, just used by the screen keyboards.
    // Separate from note events so that they can record & other cool things.
    static sendInputNoteOn(channel, noteNumber, velocity, inputSource = "internal") {
        this.noteOn(channel, noteNumber, velocity, 0);
    }
    static sendInputNoteOff(channel, noteNumber, inputSource = "internal") {
        this.noteOff(channel, noteNumber, 0);
    }
    static sendInputProgramChange(channel, instrument, inputSource = "internal") {
        this.programChange(channel, instrument);
    }
    static sendInputPitchBend(channel, bend, inputSource = "internal") {
        this.pitchBend(channel, bend);
    }

    // Get various properties from the underlying MIDI interface.
    static drumNames() {
        return MIDI.GM.drumByNote;
    }

    static byId() {
        return MIDI.GM.byId;
    }

    static channels() {
        return MIDI.channels;
    }

    static supportsMIDI() {
        return MIDI.supports["webmidi"];
    }

    static refreshInputs() { return MIDI.WebMIDI.refreshInputs(); }
    static refreshOutputs() { return MIDI.WebMIDI.refreshOutputs(); }
    static setInput(x) {
        let thisObject = this; 
        MIDI.WebMIDI.setInput(x); 
        MIDI.WebMIDI.onmidimessage = function(message) {
            thisObject.handleMIDIDeviceInput(message);
        }
    }
    static setOutput(x) { return MIDI.WebMIDI.setOutput(x); } 

    // Ouput Methods similar to those in the MIDI library, but often changed to output to
    // the desired MIDI port or to the web MIDI library's simulator (and to handle drums):
    static setMasterVolume(x) {
        MIDI.masterVolume = x;
    }
    static stopAllNotes() {
        try { MIDI.stopAllNotes(); } catch(e) { }
        try { if (this.supportsMIDI()) MIDI.WebMIDI.stopAllNotes(); } catch(e) { }
    }
    static programChange(channel, instrument) {
        if (this.supportsMIDI())
            MIDI.WebMIDI.programChange(channel, instrument);
        else
            MIDI.programChange(channel, instrument);
    }
    static pitchBend(channel, bend) {
        if (this.supportsMIDI())
            MIDI.WebMIDI.pitchBend(channel, bend);
        else
            MIDI.pitchBend(channel, bend);
    }
    static loadPlugin(obj) {
        let callerSuccess = obj.onsuccess;
        let thisObject = this;
        obj.onsuccess = function() {
            if (thisObject.supportsMIDI()) {
                // initialize WebMIDI before calling the user's success function, if you can.
                if (obj.setupMIDI) {
                    thisObject.refreshInputs();
                    thisObject.refreshOutputs();
                    thisObject.setInput(["internal"]);
                    thisObject.setOutput(["internal"]);
                    SettingsStorage.currentInput = ["internal"];
                    SettingsStorage.currentOutput = ["internal"];
                }
            }
            if (obj.initialSetup) {
                // make sure to set all channels to program 0 (except drums) at start!
                for (let i = 0; i < 16; i++) {
                    if (i == 9) thisObject.programChange(i,128);
                    else thisObject.programChange(i,0);
                }
            }
            callerSuccess();
        }
        MIDI.loadPlugin(obj);
    }
    static noteOn(channel, noteNumber, velocity, delay) {
        if (this.supportsMIDI()) 
            MIDI.WebMIDI.noteOn(channel, noteNumber, velocity, delay);
        else
            MIDI.noteOn(channel, noteNumber, velocity, delay);
    }
    static noteOff(channel, noteNumber, delay) {
        if (this.supportsMIDI())
            MIDI.WebMIDI.noteOff(channel, noteNumber, delay);
        else
            MIDI.noteOff(channel, noteNumber, delay);
    }
    static chordOn(channel, noteNumbers, velocity, delay) {
        // my chord routines just call the note routines, so new features they have, like
        // new output sources or recording notes, will only have to be done in one place.
        for (let noteNumber of noteNumbers) this.noteOn(channel, noteNumber, velocity, delay);
    }
    static chordOff(channel, noteNumbers, delay) {
        for (let noteNumber of noteNumbers) this.noteOff(channel, noteNumber, delay);
    }
}

