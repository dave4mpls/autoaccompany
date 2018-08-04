//
//  MIDI Note Object for storage in a track.
//  Created 8/3/2018 by Dave White
//  MIT License
//
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class Note {
    // general constants
    static NT_PLAYBACK_ORIGINAL_CHANNEL = -1;

    //-- note types available for use with notes
    //   these note types are handled by the note play function:
    static NT_NOTE = "note";  // regular note type
    static NT_MIDI = "midi message";  // raw midi message (stored in noteNumber, velocity, extra).
    static NT_PROGRAM_CHANGE = "instrument change";
    static NT_PITCH_BEND = "pitch bend";
    //  these note types are only used by the track
    static NT_WAIT = "wait";        // the deltas are stored here, just called "wait" (duration contains the ms time to wait)
    static NT_CHORD_SYMBOL = "chord symbol";   // useful later on for indicating chords! extra contains the textual chord symbol.
    static NT_BEAT = "beat";        // recording tapping on pedal in order to more clearly know the beat for certain musical tasks
    static NT_BAR = "bar";          // calculated barline, inserted before the downbeat during bar calculation.
    static NT_REPEAT = "repeat from"    // extra contains the ID (NOT the index) to repeat from.  duration contains the # of times to repeat. 

    //-- note on and note off are NOT stored separately, but they are sent separately to
    //   the track's recording method, which then measures and stores note duration.
    static NT_NOTE_ON = "note_on";
    static NT_NOTE_OFF = "note_off";

    constructor(id, noteType, channel, noteNumber, velocity, extra, duration) {
        this.id = id;
        this.noteType = noteType;
        this.channel = channel;
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.extra = extra;
        this.duration = duration;
    }

    clone() {
        // returns a clone of this note.
        let n2 = new Note(this.id, this.noteType, this.channel, this.noteNumber, this.velocity,
            this.extra, this.duration);
        return n2;
    }

    static load(dataObject) {
        // creates a new note from a data object with all the note data.
        // It's a static method, so: let newNote = Note.load(dataObject);
        return new Note(dataObject.id, dataObject.noteType, dataObject.channel, dataObject.noteNumber,
            dataObject.velocity, dataObject.extra, dataObject.duration);
    }

    play(overrideChannel, speed = 100.0) {
        //-- Plays this one event, right now, returning immediately (i.e. if it's a note, it will
        //-- turn off at some future point asynchronously).
        let myChannel = this.channel, myNoteNumber = this.noteNumber, myVelocity = this.velocity;
        if (overrideChannel && overrideChannel !== this.NT_PLAYBACK_ORIGINAL_CHANNEL) {
            myChannel = overrideChannel;
        }
        switch (Note.noteType) {
            case this.NT_NOTE:
                AAPlayer.noteOn(myChannel, myNoteNumber, myVelocity, 0);
                setTimeout(function() {
                    AAPlayer.noteOff(myChannel, myNoteNumber, 0);
                }, this.duration * 100.0 / speed);
                break;
            case Note.NT_PROGRAM_CHANGE:
                let instrumentNumber = this.noteNumber;
                instrumentNumber &= 0x7F;
                AAPlayer.programChange(myChannel, instrumentNumber);
                break;
            case Note.NT_PITCH_BEND:
                AAPlayer.pitchBend(myChannel, this.noteNumber);
                break;
            case Note.NT_MIDI:
                AAPlayer.send(myChannel, [this.noteNumber, this.velocity, this.extra]);
                break;
            default:
                break;      
        }
    }
}

export class DownNote {
    constructor(noteObject, startTime) {
        this.note = noteObject;
        this.startTime = startTime;
    }
}

