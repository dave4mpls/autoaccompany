//
//  Track storage for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

export class Note {
    //-- note types available for use with notes
    static NT_NOTE = "note";  // regular note type
    static NT_MIDI = "midi_message";  // raw midi message (stored in noteNumber, velocity, extra).
    static NT_PROGRAM_CHANGE = "program_change";
    constructor(noteType, channel, noteNumber, velocity, extra, delta, duration) {
        this.channel = 0;
        this.type =
    }
}

export class Track {
    //-- track: has record and playback methods based on raw MIDI messages
    constructor() {
        this.instrument = 0;
        this.nextId = 0;
        this.notes = [ ];
        this.downNotes = [ ];  // notes that are down during recording
    }
    getNextId() {
        this.nextId++;
        return nextId;
    }
}

export class TrackStorage {
    static tracks = [];
}
