//
//  MIDI Track storage and record/playback primitives for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';
import { AutoAccompanySettings } from './AutoAccompany.js';

export class Note {
    //-- note types available for use with notes
    static NT_NOTE = "note";  // regular note type
    static NT_MIDI = "midi_message";  // raw midi message (stored in noteNumber, velocity, extra).
    static NT_PROGRAM_CHANGE = "program_change";
    static NT_PITCH_BEND = "pitch_bend";

    //-- note on and note off are NOT stored separately, but they are sent separately to
    //   the track's recording method, which then measures and stores note duration.
    static NT_NOTE_ON = "note_on";
    static NT_NOTE_OFF = "note_off";

    constructor(id, noteType, channel, noteNumber, velocity, extra, delta, duration) {
        this.id = id;
        this.channel = 0;
        this.noteType = noteType;
        this.channel = channel;
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.extra = extra;
        this.delta = delta;
        this.duration = duration;
    }

    play() {
        //-- Plays this one event, right now, returning immediately (i.e. if it's a note, it will
        //-- turn off at some future point asynchronously).
        switch (Note.noteType) {
            case this.NT_NOTE:
                let myChannel = this.channel, myNoteNumber = this.noteNumber, myVelocity = this.velocity;
                AAPlayer.noteOn(myChannel, myNoteNumber, myVelocity, 0);
                setTimeout(function() {
                    AAPlayer.noteOff(myChannel, myNoteNumber, 0);
                }, this.duration);
                break;
            case Note.NT_PROGRAM_CHANGE:
                let instrumentNumber = this.noteNumber;
                instrumentNumber &= 0x7F;
                AAPlayer.programChange(this.channel, instrumentNumber);
                break;
            case Note.NT_PITCH_BEND:
                AAPlayer.pitchBend(this.channel, this.noteNumber);
                break;
            case Note.NT_MIDI:
                AAPlayer.send(this.channel, [this.noteNumber, this.velocity, this.extra]);
                break;
            default:
                break;      
        }
    }
}

class DownNote {
    constructor(noteObject, startTime) {
        this.note = noteObject;
        this.startTime = startTime;
    }
}

export class Track {
    // A recording and playback track.  Contains all methods pertaining to recording, playback,
    // and auto-accompaniment modifications.

    // general constants
    static TR_RECORD_ANY_CHANNEL = -1;

    //-- track: has record and playback methods and maintains storage for a track.
    //
    // note: this is a mutable object.  To make it work with react, make sure to use
    // setProperty() function to set any property of the track, which will update the
    // version number that you use in React state  The combination of a track reference and
    // a version number is an immutable object that changes whenever the track changes.
    // Track also has an onChange event, which you can tie to updating the state in your react component
    // whenever anything changes about the track.
    constructor() {
        //--- internal properties
        this.downNotes = { };  // notes that are down during recording
        this.startTime = 0;
        this.lastTime = 0;
        this.nextId = 0;

        //--- basic data of the track
        this.versionNumber = 0;     // increases each time the track is changed; can be used
                                    // in React state to ensure proper updates.
        this.instrument = 0;   
        this.repeat = false;        // tracks can be repeating or non-repeating
        this.recordToChannel = Track.TR_RECORD_ANY_CHANNEL;  
                // if 0-15, forces all messages to the given channel
        this.notes = [ ];       // actual note events
        this.beats = [ ];        // beats: each one a time when 

        this.mute = false;      // if true, track is muted
        this.soloMute = false;      // if true, this track is temporarily muted because another is soloing

        this.playIndex = 0;     // where we are in the playback note list, during playback.
        this.seekPosition = 0;  // the seek position we are at, in milliseconds

        //--- track playback works with auto-accompaniment settings
        this.autoAccompany = new AutoAccompanySettings();

        //--- properties relating to events
        this.callOnChangeOnRecord = false;  // does recording a note call the on-change event?

        //--- hooks for other routines to link into the record/playback process
        this.onNotePlayed = null;   // hook for playback (called with track object and note object).
        this.onNoteRecorded = null; // hook for recording (called with track and new note)
        this.onPaused = null;       // hook for pausing (parameter: track)
        this.onPlaybackStarted = null;  // for starting playback (parameter: track)
        this.onPlaybackEnded = null;    // for ending playback  (parameter: track)
        this.onRecordingStarted = null; // for starting recording (parameter: track)
        this.onRecordingEnded = null;   // for ending recording (parameter: track)
        this.onChange = null;       // anytime the track changes its data through setProperty, recording (if callOnChangeOnRecord is set), adding notes, etc.
    }
    getNextId() {
        this.nextId+=10;    // we skip by 10's like old school BASIC, to allow insertions.
                            // ID only exists so that we can sort and re-sort the data in a spreadsheet
                            // during editing.  Of course the spreadsheet, handsontable, will not affect
                            // the original data, so we don't need to sort before playback.
        return this.nextId;
    }
    setProperty(p, x) {
        // sets a property and increases the version number (see comments at start of Track)
        // and calls onChange.
        this[p] = x;
        this.versionNumber++;
        if (this.onChange) this.onChange(this);
    }

    startRecording() {
        // Call this at the beginning of recording.
        this.downNotes = { };  // clear the down-notes array
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        if (this.onRecordingStarted) this.onRecordingStarted(this);
    }

    addEvent(noteType, channel, noteNumber, velocity, extra, delta, duration) {
        //-- adds a note or event manually to the end of the notes list
        //-- you can't add note on or note off events this way-- they are only accepted by the
        //-- realtime recorder, recordEvent, below.
        let id = this.getNextId();
        let n = new Note(id, noteType, channel, noteNumber, velocity, extra, delta, duration);
        this.notes.push(n);
        if (this.onChange) this.onChange(this);
        return n;
    }

    recordEvent(eventType, channel, noteNumber, velocity, extra) {
        //  Call this in real-time as notes are sent; it captures the timing information for you.
        //  It also tracks notes over time to combine note-on and note-off events into note events.
        //  Use addEvent to manually add an event.
        //  Remember: for a raw MIDI event not otherwise mentioned, use eventType = NT_MIDI,
        //  then put the three MIDI bytes in noteNumber, velocity and extra.
        
        // first, handle timestamps.  (Note Off events aren't recorded as separate events so they
        // don't advance the clock.)
        let currentTime = performance.now();
        let delta = currentTime - this.lastTime;
        if (eventType !== Note.NT_NOTE_OFF) this.lastTime = currentTime;
        // next, get actual channel to record to
        if (this.recordToChannel !== Track.TR_RECORD_ANY_CHANNEL)
            channel = this.recordToChannel;
        // determine note signature for down-note hash
        let noteSig = channel + ":" + noteNumber;
        
        if (eventType === Note.NT_NOTE_OFF) {
            // note-off event is special: it looks back for a note-on and finishes it
            if (this.downNotes.hasOwnProperty(noteSig)) {
                let originalDownNote = this.downNotes[noteSig];
                originalDownNote.note.duration = currentTime - originalDownNote.startTime;
                delete this.downNotes[noteSig];
            }
        }
        else {
            //-- all non-note-off events: create new note/event
            let newNote = this.addEvent(eventType, channel, noteNumber, velocity, extra, delta, 0);
            if (this.onNoteRecorded) this.onNoteRecorded(this, newNote);
            if (this.callOnChangeOnRecord && this.onChange) this.onChange(this);
            if (eventType === Note.NT_NOTE_ON) {
                // for note-on, we have to save a down-note so we can determine note duration later.
                let newDownNote = new DownNote(newNote, currentTime);
                this.downNotes[noteSig] = newDownNote;
            }
        }
    }

    turnOffAllNotes() {
        // Turns off all down notes.  Used at end of track and before repeats.
        // Effectively resolves the duration of any open notes so they end right now.
        let currentTime = performance.now();
        for (let originalDownNote in this.downNotes) { 
            originalDownNote.note.duration = currentTime - originalDownNote.startTime;
        }
        this.downNotes = { };
    }

    stopRecording() {
        //-- Call this when you stop recording.
        this.turnOffAllNotes();
    }

    duration(allCyclesFlag) {
        //-- The duration property returns the length of the track.  If allCyclesFlag is false, it
        //-- returns the length of all the notes, ignoring repeat instructions.  If allCyclesFlag is true,
        //-- it returns the actual length of playback, meaning, for tracks that end in REPEAT, it will return
        //-- Infinity.  (To find the duration of a song, you find the duration of the longest track that 
        //-- is non-repeating.)
        let totalDelta = 0; let hasRepeat = this.repeat; let lastDuration = 0;
        for (var i = 0; i < this.notes.length; i++) {
            totalDelta += this.notes[i].delta;
            if (this.notes[i].noteType === Note.NT_NOTE) lastDuration = this.notes[i].duration;
        }
        if (allCyclesFlag && hasRepeat)
            return Infinity;
        else    
            return totalDelta + lastDuration;
    }

    rewind() {
        //-- Call this to rewind to the beginning of the track.
        this.playIndex = 0;
        this.seekPosition = 0;
    }

    indexAt(newPosition) {
        // TODO: needs fixed up
        // returns [note index, delta to wait to play note] for a given song position in ms.
        // returns [-1,-1] if newPosition is past the end of the track.
        if (newPosition < 0) return [-1,-1];
        if (newPosition === 0) return 0.0;
        //--- find a position equal to or just past the desired start time
        let startIndex = 0;
        let deltaSoFar = 0;
        while (deltaSoFar < newPosition) {
            deltaSoFar += this.notes[startIndex].delta;
            startIndex++;
            if (startIndex >= this.notes.length) {
                    startIndex = 1;     // we skip the delta on note 0 for repeats-- it gets played immediately
                    if (!this.repeat) return -1;  // really did pass the end, so don't play.
            }
        }
        if (deltaSoFar === newPosition) return startIndex;
    }

    seek(newPosition) {
        //   TODO: needs fixed up to call indexAt
    }

    play() {
        let thisObject = this;
        //-- Call this to begin playing back the track, starting at the current index position, with
        //-- no delay.  Use rewind() first to go to the beginning.
        let continueLoop = true;
        let repeatedFlag = false;
        // we have this iterative loop to handle chords that are played EXACTLY at the same time;
        // otherwise, notes have deltas between them, so the playing is asynchronous.
        while (continueLoop) {
            if (thisObject.notes.length === 0) return;   // going forward let's assume we have notes :-)
            // Get the note we want, and determine the delta for it, and handle repeats.
            if (this.playIndex >= thisObject.notes.length) {
                if (!this.repeat) return;
                this.playIndex = 0;
                repeatedFlag = true;
            }
            else
                repeatedFlag = false;
            let thisEvent = this.notes[this.playIndex];
            let thisDelta = thisEvent.delta;
            if (repeatedFlag) thisDelta = 0;
                //-- note: when we repeat, we do NOT repeat the delta of the first note-- the downbeat
                //-- of pressing the "end record and repeat" key is the SAME as the first note (i.e. we
                //-- already waited the appropriate delta as part of THIS repeat note).
            // Now we have the note we want. Play it now or later, as needed.
            if (thisDelta === 0) {
                //-- no delta (as in a chord): play this note right away, then
                //-- continue around the synchronous, iterative loop to the next note.
                if (thisObject.onNotePlayed) thisObject.onNotePlayed(thisObject, thisEvent);
                thisEvent.play();
                this.playIndex++;
                this.seekPosition += thisDelta;
                continueLoop = (this.playIndex < this.notes.length);
            } else {
                // but NORMALLY, we set up the note to play later, and then it re-calls
                // track::play, on the next note, etc.
                setTimeout(function() {
                    if (thisObject.onNotePlayed) thisObject.onNotePlayed(thisObject, thisEvent);
                    thisEvent.play();
                    thisObject.playIndex++;
                    thisObject.seekPosition += thisDelta;
                    thisObject.play();
                }, thisDelta);
                continueLoop = false;
            }
        }
    }
}

export class TrackStorage {
    static tracks = [];
}

export let TrackList = new TrackStorage();
