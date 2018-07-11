//
//  AAPlayer class encapsulates MIDI playing functions from all sources and
//  corrects any errors in MIDI lilbrary-- for example, ensures that we use the
//  correct, available input sources and so forth.
//

import  MIDI from 'midi_drums';

export default class AAPlayer {
    // MIDI related constants
    static MIDI_DRUM_CHANNEL = 9;
    static MIDI_DEFAULT_KEYBOARD_CHANNEL = 0;

    // Settings 
    static playInputSources = [ "internal" ];  
        // ^ list of MIDI input sources that get re-played out to the output devices
        // when an input signal is received.  For example, internal screen keyboard
        // doesn't make any sound, so make sure to play the notes the user presses.
        // External MIDI keyboard makes its own sounds (unless of course you turn off local playing)
        // so you wouldn't include it in this list.

    // Internal state

    // Support routines for input processing, recording and routing

    

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

    // Ouput Methods similar to those in the MIDI library, but often changed to output to
    // the desired MIDI port or to the web MIDI library's simulator (and to handle drums):
    static setMasterVolume(x) {
        MIDI.masterVolume = x;
    }
    static programChange(channel, instrument) {
        MIDI.programChange(channel, instrument);
    }
    static loadPlugin(obj) {
        MIDI.loadPlugin(obj);
    }
    static noteOn(channel, noteNumber, velocity, delay) {
        MIDI.noteOn(channel, noteNumber, velocity, delay);
    }
    static noteOff(channel, noteNumber, delay) {
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

