//
//  AAPlayer class encapsulates MIDI playing functions from all sources and
//  corrects any errors in MIDI lilbrary-- for example, ensures that we use the
//  correct, available input sources and so forth.
//

import MIDI from 'midi.js';   // License: MIT


export default class AAPlayer {
    // MIDI related constants
    MIDI_DRUM_CHANNEL = 9;
    MIDI_DEFAULT_KEYBOARD_CHANNEL = 0;

    // Methods
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

