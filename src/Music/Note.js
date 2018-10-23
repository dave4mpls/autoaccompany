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
        this.nto = null;        // note timer objectused to store the setTimeout timer handle while the note is playing.
        this.sf = null;         // function for stopping the note; programmed into the timer but can be called early if needed.
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

    play(overrideChannel, speed = 100.0, overrideNoteNumber = -1, notePlayingArray = null) {
        //-- Plays this one event, right now, returning immediately (i.e. if it's a note, it will
        //-- turn off at some future point asynchronously).  Override Channel overrides the channel,
        //-- unless it's NT_PLAYBACK_ORIGINAL_CHANNEL.  OverrideNoteNumber overrides the note number
        //-- (typically used when adjusting notes for Auto Accompaniment). -1 leaves the note the same. The note playing array
        //-- is maintained by this routine, you just pass in the array and it adds the note when it
        //-- plays it, and removes the note when it is done or when you call stop on the note.
        let myChannel = this.channel, myNoteNumber = this.noteNumber, myVelocity = this.velocity;
        let thisObject = this;
        if (overrideChannel && overrideChannel !== Note.NT_PLAYBACK_ORIGINAL_CHANNEL) {
            myChannel = overrideChannel;
        }
        if (overrideNoteNumber !== -1) myNoteNumber = overrideNoteNumber;
        switch (this.noteType) {
            case Note.NT_NOTE:
            case Note.NT_NOTE_ON:
                AAPlayer.noteOn(myChannel, myNoteNumber, myVelocity);
                this.sf = function() {
                    // function for turning off a note and removing it from the note playing array.
                    AAPlayer.noteOff(myChannel, myNoteNumber);
                    this.nto = null;   // setting this back to null lets us know the note is done playing.
                    if (notePlayingArray !== null) {
                        for (let i = 0; i < notePlayingArray.length; i++) {
                            if (notePlayingArray[i]===thisObject) { notePlayingArray.splice(i,1); i--; }
                        }
                    }
                }
                this.nto = setTimeout(this.sf, this.duration * 100.0 / speed);
                if (notePlayingArray !== null) notePlayingArray.push(this);
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

    stop() {
        // stops the note playing immediately.
        if (this.nto === null) return;  // not playing -- so stop has no effect.
        clearTimeout(this.nto);     // prevent the timeout from happening
        this.sf();        // and run its function now instead (stopping note, removing from note array, etc.)
    }
}

export class DownNote {
    constructor(noteObject, startTime) {
        this.note = noteObject;
        this.startTime = startTime;
    }
}

