//
//  MIDI Track storage and record/playback primitives for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';
import { AutoAccompanySettings } from './AutoAccompany.js';
import { EventHandler } from '../EventHandler.js';
import { Note, DownNote } from './Note.js';

export class Track {
    // A recording and playback track.  Contains all methods pertaining to recording, playback,
    // and auto-accompaniment modifications.

    //-- track: has record and playback methods and maintains storage for a track.
    //
    // note: this is a mutable object.  To make it work with react, make sure to use
    // setProperty() function to set any property of the track, which will update the
    // version number that you use in React state  The combination of a track reference and
    // a version number is an immutable object that changes whenever the track changes.
    // Track also has an onChange event, which you can tie to updating the state in your react component
    // whenever anything changes about the track.
    //

    //--- track types
        // some tracks are chord tracks, some are rhythm tracks (barlines),
        // and some are regular tracks.  They are all part of a song object.
        // The chord tracks track only the chord changes (inputted via the
        // accompaniment keyboard, or manually).  The rhythm track tracks
        // the barlines for all tracks as some of them may repeat and fade
        // in or out (tracks don't HAVE to start at the beginning).
    static TR_REGULAR = "regular track";
    static TR_CHORD = "chord change track";
    static TR_RHYTHM = "rhythm track";

    constructor() {

        //--- determine unique track ID for local storage index
        this.resetMediaState();

        //--- bind functions
        this._internal_play = this._internal_play.bind(this);

        //--- linkback to song
        this._song = null;

        //--- basic data of the track
        this._instrument = 0;   
        this._notes = [ ];       // actual note events

        this._mute = false;      // if true, track is muted
        this._solo = false;     // solo flag; maintained in track, then used to calculate soloMute when song starts playing all tracks.
        this._soloMute = false;      // if true, this track is temporarily muted because another is soloing
        this._playbackChannel = Note.NT_PLAYBACK_ORIGINAL_CHANNEL;
                                // tracks record the original incoming channel; but you can
                                // and often do play them back on one particular channel.
                                // Choices are 0-15 or TR_PLAYBACK_ORIGINAL_CHANNEL.
        this._trackType = Track.TR_REGULAR;
        this._speed = 100;      // speed of playback as a percent of normal speed.
                                // Note: recording is always done with realtime time measurements.
                                // Then if you play it back again it will play back at the new speed.
        this._name = "";        // you can name a track if you want.

        //--- track playback works with auto-accompaniment settings (publicly accessible)
        this.autoAccompany = new AutoAccompanySettings();

        //--- hooks for other routines to link into the record/playback process
        this.events = new EventHandler();
        this.events.addEventMethods(this, this.events);
        this._versionNumber = 0;     // increases each time the track is changed; can be used
                                    // in React state to ensure proper updates.
        this.attachEventHandler("onChange",function(t) {
            t._versionNumber++;
            // Since this onChange handler is attached first, the caller's onChange handler
            // will get the new version number.
        });

        //--- recognized hooks include:  
        // onNotePlayed        : hook for playback (called with track object and note object).
        // onNoteRecorded      : hook for recording (called with track and new note)
        // onPlaybackStarted   : for starting playback (parameter: track)
        // onPlaybackEnded     : for ending playback  (parameter: track)
        // onRecordingStarted  : for starting recording (parameter: track)
        // onRecordingEnded    : for ending recording (parameter: track)
        // onChange            : anytime the track changes its data through setProperty, recording (if callOnChangeOnRecord is set), adding notes, etc.
        // onChordChange       : whenever a chord-change note is played (parameter: object with track, note)
        // onBeat              : whenever a beat signal is played (parameter: object with track, note)
    }
    setNoPropertyChangesFlag(f) { this._noPropertyChanges = f; }  // use this to turn off firing of change event on property changes
    setProperty(p, x) {
        // sets a property and increases the version number (see comments at start of Track)
        // and calls onChange.
        this["_" + p] = x;
        this._versionNumber++;
        if (p != "soloMute" && (!(this._noPropertyChanges))) 
            this.fireEvent("onChange", this);
    }
    getProperty(p) {
        // outsiders must call this to get a property.
        return this["_"+p];
    }
    getVersionNumber() { return this._versionNumber; }

    startRecording() {
        // Call this at the beginning of recording.
        this._downNotes = { };  // clear the down-notes array
        this._startTime = AAPlayer.currentTimeMs();
        this._lastTime = this._startTime;
        this._isRecording = true;
        this.fireEvent("onRecordingStarted", this);
    }

    isRecording() {
        return this._isRecording;
    }

    eraseAllEvents() {
        this._downNotes = { };
        this._notes = [ ];
        this.fireEvent("onChange", this);
    }

    assignInOrderId(i) {
        // Used by some of the note-writing routines: Assigns a valid, and preferably
        // integer, ID number to a newly added/inserted note, so the ID's will be in order.
        // ID's are used as reference points for REPEATs and in direct editing in spreadsheet
        // view (which lets you sort the notes different ways-- sorting by ID means "order of
        // playback").  
        let previousId = (i > 0 ? this._notes[i-1].id : 0);
        let nextId = (i < this._notes.length-1 ? this._notes[i+1].id : this._notes[i].id + 200);
        let currentId = (previousId + nextId) / 2;
        if (Math.floor(currentId) > previousId && Math.floor(currentId) < nextId) 
            currentId = Math.floor(currentId);
        this._notes[i].id = currentId;
    }

    addEvent(noteType, channel, noteNumber, velocity, extra, duration) {
        //-- adds a note or event manually to the end of the notes list
        //-- you can't add note on or note off events this way-- they are only accepted by the
        //-- realtime recorder, recordEvent, below.
        let n = new Note(0, noteType, channel, noteNumber, velocity, extra, duration);
        return this.pushNote(n);
    }

    recordEvent(eventType, channel, noteNumber, velocity, extra) {
        //  Call this in real-time as notes are sent; it captures the timing information for you.
        //  It also tracks notes over time to combine note-on and note-off events into note events.
        //  Use addEvent to manually add an event.
        //  Remember: for a raw MIDI event not otherwise mentioned, use eventType = NT_MIDI,
        //  then put the three MIDI bytes in noteNumber, velocity and extra.
        
        // first, handle timestamps.  (Note Off events aren't recorded as separate events so they
        // don't advance the clock.)
        if (!this._isRecording) return;  // ignore if we haven't started recording yet
        let currentTime = AAPlayer.currentTimeMs();
        let delta = currentTime - this._lastTime;
        if (eventType !== Note.NT_NOTE_OFF) this._lastTime = currentTime;
        // determine note signature for down-note hash
        let noteSig = channel + ":" + noteNumber;
        
        // record the delta as an NT_WAIT event
        if (delta >= 0.01 && eventType !== Note.NT_NOTE_OFF) 
            this.addEvent(Note.NT_WAIT, channel, 0, 0, 0, delta);

        // now record the event
        if (eventType === Note.NT_NOTE_OFF) {
            // note-off event is special: it looks back for a note-on and finishes it
            if (this._downNotes.hasOwnProperty(noteSig)) {
                let originalDownNote = this._downNotes[noteSig];
                originalDownNote.note.duration = currentTime - originalDownNote.startTime;
                delete this._downNotes[noteSig];
            }
        }
        else {
            //-- all non-note-off events: create new note/event
            if (eventType == Note.NT_NOTE_ON) eventType = Note.NT_NOTE;
            let newNote = this.addEvent(eventType, channel, noteNumber, velocity, extra, delta, 0);
            this.fireEvent("onNoteRecorded", {track: this, note: newNote});
            if (eventType === Note.NT_NOTE_ON || eventType === Note.NT_NOTE) {
                // for note-on, we have to save a down-note so we can determine note duration later.
                let newDownNote = new DownNote(newNote, currentTime);
                this._downNotes[noteSig] = newDownNote;
            }
        }
    }

    turnOffAllNotes() {
        // Turns off all down notes.  Used at end of track and before repeats.
        // Effectively resolves the duration of any open notes so they end right now.
        let currentTime = AAPlayer.currentTimeMs();
        for (let originalDownNote in this._downNotes) { 
            originalDownNote.note.duration = currentTime - originalDownNote.startTime;
        }
        this._downNotes = { };
    }

    stopRecording() {
        //-- Call this when you stop recording.
        this.turnOffAllNotes();
        this._isRecording = false;
        this.fireEvent("onRecordingEnded", this);
    }

    clearEndPosition() { this._endPosition = -1; }  // clear the end position, supplied by the song to stop infinite tracks
    setEndPosition(p) { this._endPosition = p; } // set the end position (used by the song level)

    resetMediaState() {
        //--- Resets all properties of the track that relate to tracking playback and recording
        //--- (and which do not specify data that must be saved).
        //--- internal properties
        this._downNotes = { };  // notes that are down during recording
        this._notesPlaying = [ ];   // notes that are currently playing, which help the Stop command stop better
        this._startTime = 0;
        this._lastTime = 0;
        this._noPropertyChanges = false;
        //-- resets all the playback related properties 
        this._playIndex = 0;     // where we are in the playback note list, during playback.
        this._seekPosition = 0;  // the seek position we are at, in milliseconds
        this._endPosition = -1;     // if >=0, the position, supplied by the song, when all tracks (including infinite tracks) should stop.
        this._repeatCounts = { };   // when repeating, we need to count down # of repeats.
        this._indexOfRemainingTime = 0; // used by the indexOf routine
        this._stopFlag = false; // stop() sets it true to tell asynch playback routines to stop
        this._isPlaying = false;
        //--- flags to support the caller's isRecording() and isPlaying() functions
        this._isRecording = false;
        this._isPlaying = false;
    }

    indexOfId(desiredId) {
        //-- Returns the index in the note array of the given note ID number.
        //-- Returns -1 if not found.
        for (let i = 0; i < this._notes.length; i++) {
            if (this._notes[i].id === desiredId) return i;
        }
        return -1;
    }

    handleRepeatCount(repeatCountObject, id, numberOfRepeats) {
        // Manages a repeat-count object in order to simplify processing of repeats.
        // Returns true if the track should repeat, false otherwise.
        if (numberOfRepeats === Infinity) return true; // always repeat on infinite repeats!
        if (!repeatCountObject.hasOwnProperty(id)) {
            // repeat not encountered before; start at the # of repeats
            repeatCountObject[id] = numberOfRepeats;
        }
        let currentRepeats = repeatCountObject[id];
        if (currentRepeats <= 0) {  // at zero? we must stop repeating!
            delete repeatCountObject[id];
            return false;
        }
        currentRepeats--;
        repeatCountObject[id] = currentRepeats;
        return true;
    }

    indexOf(desiredElapsedTime, allowInfinityFlag = true) {
        //-- Walks through the song and locates the index of the exact elapsed time given.
        //   Follows all repeats.  If elapsedTime is -1, returns the duration of the
        //   entire track instead, or Infinity if it repeats forever.  If allowInfinityFlag is
        //   false, instead of Infinity it returns the duration up until the first infinite repeat.  
        //   Returns -1 on invalid input, or elapsed time past the end of the track.
        //   Result is in milliseconds.
        //   If the index lands exactly at the start of a note, that note's index will be
        //   returned.  If it is in the middle of an NT_WAIT, you may have to wait the portion
        //   of remaining time and then start on the next note to get the exact time you wanted.
        //   You can get the remaining time from the last indexOf call by looking at
        //   this._indexOfRemainingTime.
        //
        if (desiredElapsedTime < 0 && desiredElapsedTime !== -1) return -1;  // invalid
        let i = 0; let elapsedTime = 0; 
        let repeatCounts = { };
        this._indexOfRemainingTime = 0;  // usually this is zero, we just fill it in in the exceptional cases
        while (true) {
            if (i >= this._notes.length) {
                // end of the track: if duration request, return duration;
                // otherwise, return -1 for error
                if (desiredElapsedTime === -1) return elapsedTime;
                else return -1;
            }
            if (desiredElapsedTime !== -1 && Math.abs(elapsedTime - desiredElapsedTime) < 0.01) {
                // got an exact match (allowing for floating point errors)
                return i;
            }
            let thisNote = this._notes[i];
            switch (thisNote.noteType) {
                case Note.NT_WAIT:
                    // Most time is enveloped in NT_WAITs (note duration isn't counted).
                    // See if our elapsed time is within the waiting period.
                    if (desiredElapsedTime !== -1 && elapsedTime - 0.01 <= desiredElapsedTime 
                        && desiredElapsedTime <= elapsedTime + thisNote.duration * 100.0 / this._speed + 0.01) {
                        this._indexOfRemainingTime = (elapsedTime + thisNote.duration * 100.0 / this._speed)
                            - desiredElapsedTime;
                        return i;
                    }
                    elapsedTime += thisNote.duration * 100.0 / this._speed;
                    i++;
                    break;
                case Note.REPEAT:
                    // We also have to keep an eye out for repeats.  Just like in playback,
                    // we have to track the counts for each repeat.
                    if (thisNote.duration === Infinity && desiredElapsedTime === -1) {
                        if (allowInfinityFlag)
                            return Infinity;    // if request is for duration, & we have an infinite repeat, return Infinity.
                        else
                            return elapsedTime;
                    }
                    if (this.handleRepeatCount(repeatCounts, thisNote.id, thisNote.duration)) {
                        // The handle-repeat-count routine says we repeat again, so do it.
                        i = this.indexOfId(thisNote.extra);
                        if (i < 0) i = thisNote.length;  // end the song if repeat is invalid
                    }
                    else
                        i++;
                    break;
                default:
                    // all other events, we just advance to the next ones.
                    // (Notes are considered to be "start playing" commands and have no duration.)
                    i++;
                    break;
            }
        }
    }
    
    duration(allowInfinityFlag = true) {
        // Returns the duration of the track in milliseconds.
        // May return Inifinity if there are any infinite repeats.
        // To avoid getting Infinity, set the allowInfinityFlag to false, in which case
        // you will get the duration of the track before its first infinite repeat symbol.
        return this.indexOf(-1, allowInfinityFlag);
    }

    rewind() {
        //-- Call this to rewind to the beginning of the track.
        this._playIndex = 0;
        this._seekPosition = 0;
        this._repeatCounts = { };
    }

    seek(newPosition) {
        //   Seeks to a given elapsed time and begins playing.
        //   Returns -1 on error or 0 on success.  Non-blocking (playing is asynchronous).
        this.rewind();
        let startIndex = this.indexOf(newPosition);
        if (startIndex < 0) return -1;
        this._playIndex = startIndex;  // start playback here.
        if (this._indexOfRemainingTime > 0) {
            // We have remaining time on this wait, so advance to the next note.
            this._playIndex++;
        }
        let thisObject = this;
        // now, asynchronously play the track.
        setTimeout(function() {
            thisObject.play();
        }, this._indexOfRemainingTime);
    }

    play() {
        //-- Plays the track, at the current position (use rewind() first to start from the start).
        //-- Non-blocking (playback is asynchronous).  Use stop() to stop playback.
        //-- Always call with no parameters; internalCall is only true internally.
        this._stopFlag = false;
        if (this._playbackChannel !== Note.NT_PLAYBACK_ORIGINAL_CHANNEL)
            AAPlayer.programChange(this._playbackChannel, this._instrument);
        this._isPlaying = true;
        this.fireEvent("onPlaybackStarted",this);
        this._internal_play();
    }

    isPlaying() {
        return this._isPlaying;
    }

    _internal_play() {
        //-- internal routine used to implement play(), above.
        while (true) {
            // We break the loop if and only if the song is over.
            if (this._stopFlag) break;     // stop requested so stop (don't turn off flag, what if more than one note is playing?)
            if (this._playIndex >= this._notes.length) break;  // end of track
            if (this._endPosition >= 0 && this._endPosition < this._seekPosition) break;  // end of song 
            let thisNote = this._notes[this._playIndex];
            switch (thisNote.noteType) {
                case Note.NT_WAIT:
                    // wait: asynchronously call ourselves after the wait is over.
                    this._playIndex++;
                    this._seekPosition += thisNote.duration * 100.0 / this._speed;
                    // no closure below: don't want to start filling memory up with
                    // closure stack frames (not sure if that would happen, but let's be safe).
                    setTimeout(this._internal_play, thisNote.duration * 100.0 / this._speed);
                    return;  // NOT break because the song isn't over!
                case Note.NT_NOTE:
                case Note.NT_NOTE_ON:
                    // note: remember that if we play the note, we have to put it in the playing notes array
                    // and take it out again, such that the stop notes function can stop them all on a dime
                    if ((!this._mute) && (!this._soloMute)) {
                        thisNote.play(this._playbackChannel, this._speed, -1, this._notesPlaying);
                    }
                    this._playIndex++;
                    break;
                case Note.NT_PITCH_BEND:
                case Note.NT_MIDI:
                case Note.NT_PROGRAM_CHANGE:
                    // message that the note can handle itself: have the note handle it.
                    // Remember to send it the playback channel in case it needs to change the channel.
                    thisNote.play(this._playbackChannel, this._speed);
                    this._playIndex++;
                case Note.NT_REPEAT:
                    if (this.handleRepeatCount(this._repeatCounts, thisNote.id, thisNote.duration)) {
                        // The handle-repeat-count routine says we repeat again, so do it.
                        let i = this.indexOfId(thisNote.extra);
                        if (i < 0) i = this._notes.length;  // end the song if repeat is invalid
                        this._playIndex = i;
                    }
                    else    
                        this._playIndex++;
                    break;
                case Note.NT_CHORD:
                    // Chord change (a recording of the pressing of accompaniment keys, or
                    // a manually inserted chord change):
                    this.fireEvent("onChordChange", {track: this, note: thisNote}); 
                            // Typically, the song event listens for chord changes and then
                            // sends them to the auto-accompany objects in all the other tracks.
                    this._playIndex++;
                    break;
                case Note.NT_BEAT:
                    this.fireEvent("onBeat", {track: this, note: thisNote});
                    this._playIndex++;  // there is an event fired for each recorded Beat.
                    break;
                default:
                    // ignore other messages, such as bar and beat
                    // TODO: enable chord symbols to play sounds if a flag is set
                    this._playIndex++;
                    break;
            }
        }
        // While loop is only exited if the song is over.  So that means it's over.
        this._isPlaying = false;
        this.fireEvent("onPlaybackEnded", this);
    }

    stopNotes() {
        // Stop playback of all current notes WITHOUT necessarily stopping playback.
        // You do this to put a firm end to any accompaniment notes currently playing when
        // the accompaniment keys change (among other reasons).
        let copyOfStopList = this._notesPlaying.slice(0);  // we copy it since the original array will keep losing notes!
        for (let i = 0; i < copyOfStopList.length; i++)
            copyOfStopList[i].stop();
    }

    stop() {
        // Stop playback.  Notes currently being played will finish.
        // You can use stop() as a pause button too, just don't reset the
        // playback pointer.
        this.stopNotes();
        this._stopFlag = true;
    }

    stopAll() {
        // Stop either playback, recording, or both, whichever is happening now.
        if (this.isPlaying()) this.stop();
        if (this.isRecording()) this.stopRecording();
    }

    //
    //  Routines for getting/putting/inserting/deleting notes.
    //  Remember, the _notes array is internal, don't use it directly.
    //
    getNoteCount() { return this._notes.length; }

    getChannelsUsed() {
        // Returns which channels are used in this track.  It will either be the
        // playback channel, or if that channel is NT_PLAYBACK_ORIGINAL_CHANNEL,
        // we scan all the notes and return an array of what channels are used.
        // In any case we return an array of used channels.
        if (this._playbackChannel !== Note.NT_PLAYBACK_ORIGINAL_CHANNEL) {
            return [ this._playbackChannel ];  // simple: track all plays back on one channel.
        }
        let channelsUsed = [ ];
        for (let i = 0; i < this._notes.length; i++) {
            if (channelsUsed.indexOf(this._notes[i].channel) === -1)
                channelsUsed.push(this._notes[i].channel);
        }
        channelsUsed.sort();
        return channelsUsed;
    }

    getNote(i) {
        if (i < 0 || i >= this._notes.length) return null;
        return this._notes[i];
    }

    putNote(i, n) {
        if (i < 0) i = 0;
        if (i >= this._notes.length) 
            return this.pushNote(n);
        else
            this._notes[i] = n; 
        this.fireEvent("onChange", this);
        return n;
    }

    pushNote(n) {
        this._notes.push(n);
        this.assignInOrderId(this._notes.length - 1);
        this.fireEvent("onChange", this);
        return n;
    }

    insertNote(i, n) {
        // Note: If you use insertNote, you can insert one during playback.
        // Useful for inserting barlines or beats while playing back a track, for example.
        if (i < 0) i = 0;
        if (i >= this._notes.length) { return this.pushNote(n);  }
        if (i <= this._playIndex) this._playIndex++;   // when inserting, move the play index
        this._notes.splice(i,0,n);
        // As part of inserting a note, we have to give it an in-order ID #, ideally
        // an integer (if possible) and between the ID's before and after it.
        this.assignInOrderId(i);
        this.fireEvent("onChange",this);
        return n;
    }

    deleteNote(i) {
        // You can delete a note during playback too.
        if (i < 0 || i >= this._notes.length) return;
        if (i < this._playIndex) this._playIndex--;  // adjust play index
        this._notes.splice(i,1);
        this.fireEvent("onChange", this);
    }

    //
    //  Routines for adding and removing barlines, beats, and chord symbols.
    //  These won't be as needed now because we are putting beats and chords on different tracks,
    //  but might as well finish them...
    //
    deleteNotesOfTypes(typeArray) {
        // deletes notes matching various types.
        for (let i = 0; i < this._notes.length; i++) {
            if (typeArray.indexOf(this._notes[i].noteType) >= 0) {
                this.deleteNote(i);
                i--;
            }
        }
    }

    clearBarlines() { this.deleteNotesOfTypes([Note.NT_BAR]) }
    clearBeats() { this.deleteNotesOfTypes([Note.NT_BEAT]) }
    clearRhythm() { this.deleteNotesOfTypes([Note.NT_BAR, Note.NT_BEAT]) }
    clearChords() { this.deleteNotesOfTypes([Note.NT_CHORD_SYMBOL]) }

    addNoteAtElapsedTime(n,desiredElapsedTime) {
        // Adds a note event at a given elapsed time.
        let noteIndex = this.indexOf(desiredElapsedTime);
        if (noteIndex < 0) return null;
        if (this._notes[noteIndex].noteType === Note.NT_WAIT && this._indexOfRemainingTime !== 0) {
            // desired elapsed time splits a NT_WAIT element: break it in half.
            let wn = this._notes[noteIndex].clone();
            let wnOriginalDuration = wn.duration;
            this.insertNote(noteIndex, wn);
            this._notes[noteIndex].duration = wnOriginalDuration - this._indexOfRemainingTime;
            this._notes[noteIndex+1].duration = this._indexOfRemainingTime;
            noteIndex++;
        }
        return this.insertNote(noteIndex, n);
    }

    //
    //  Clone tracks, load tracks from JSON, save tracks to JSON.
    //
    clone() {
        // Note: Cloning a track does NOT clone the event handlers.  You have to
        // re-add those to the new track if you want them.
        let newTrack = new Track();
        // copy all the main properties, but not the structures
        for (let thisProperty in this) {
            if (thisProperty[0] != "_") continue;
            if (thisProperty == "_notes" || thisProperty == "autoAccompany") continue;
            newTrack[thisProperty] = this[thisProperty];
        }
        // now, clone all the notes
        for (let i = 0; i < this._notes.length; i++) {
            newTrack._notes.push(this._notes[i].clone());
        }
        // reset the media state
        newTrack.resetMediaState();
        // and finally, clone the auto-accompany structure.
        newTrack.autoAccompany = this.autoAccompany.clone();
        return newTrack;
    }
    save() {
        // For saving a track, all the critical data will be captured with a straight JSON stringify.
        // But we have to remove the song list first to avoid circular references.
        let songReference = this._song;
        this._song = null;
        let s = JSON.stringify(this);
        this._song = songReference;
        return s;
    }
    static load(jsonText) {
        // For loading, we have a static method (so you do let loadedTrack = Track.load(jsonText)).
        // It is very similar to cloning.
        let source = JSON.parse(jsonText);      // simple data object (no track methods)
        let newTrack = new Track();     // new complex track object (but alas, no data)
        // copy all the main properties, but not the structures
        for (let thisProperty in source) {
            if (thisProperty[0] != "_") continue;
            if (thisProperty == "_notes" || thisProperty == "autoAccompany") continue;
            newTrack[thisProperty] = source[thisProperty];
        }
        // now, create all the notes
        for (let i = 0; i < source._notes.length; i++) {
            newTrack._notes.push(Note.load(source._notes[i]));
        }
        // reset the media state
        newTrack.resetMediaState();
        // and finally, load the auto-accompany structure.
        newTrack.autoAccompany = AutoAccompanySettings.load(source.autoAccompany);
        return newTrack;
    }

}

