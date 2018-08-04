//
//  MIDI Song storage and record/playback methods for Musical Playground
//  Created 8/3/2018 by Dave White
//  A song is a group of related tracks that can play or record together
//  It may include a barline/beat track (which helps with quantization),
//  a chord track (which records the chord changes played on the accompaniment keys,
//  or later you may be able to put in your own chord progression),
//  and all the regular tracks which contain regular notes that play.
//
//  A song is sufficiently large that instead of loading and saving directly from JSON, it
//  loads and saves each track separately to Local Storage.
//
//  MIT License
//

import { EventHandler } from '../EventHandler.js';
import { Note } from './Note.js';
import { Track } from './Track.js';

export class Song {
    constructor() {
        this._name = "";
        this._selected = 0;     // selected track
        this._tracks = [ ];
        //--- hooks for other routines to link into the record/playback process
        //    similar to for Track
        this.events = new EventHandler();
        this.events.addEventMethods(this, this.events);
        this._versionNumber = 0;     // increases each time the track is changed; can be used
                                    // in React state to ensure proper updates.
        this.attachEventHandler("onChange",function(t) {
            t._versionNumber++;
            // Since this onChange handler is attached first, the caller's onChange handler
            // will get the new version number.
        });
    }

    //--- internal routines
    _clearSoloFlags(fireChangeFlag = false, setSoloMuteFlag = false) {
        //-- clear all the solo flags without raising a "change" event unless fireChangeFlag is true
        //-- if setSoloMuteFlag is true, it sets all the soloMute flags.
        for (let i = 0; i < this._tracks.length; i++) {
            if (!fireChangeFlag) this._tracks[i].setNoPropertyChangesFlag(true);
            this._tracks[i].setProperty("solo", false);
            this._tracks[i].setProperty("soloMute", setSoloMuteFlag);
            if (!fireChangeFlag) this._tracks[i].setNoPropertyChangesFlag(false);
        }
    }
    _setSoloFlags() {
        //-- sets the solo mute flags for all the tracks, to match the one track having a solo flag.
        //-- 
        let currentSolo = this.getSoloTrack();
        this._clearSoloFlags(false, (currentSolo >= 0));
        if (currentSolo < 0) return;
        this._tracks[currentSolo].setNoPropertyChangesFlag(true);
        this._tracks[currentSolo].setProperty("solo",true);
        this._tracks[currentSolo].setProperty("soloMute", false);
        this._tracks[currentSolo].setNoPropertyChangesFlag(false);
    }

    //--- song modification routines (public)
    setName(n) { this._name = n; this.fireEvent("onChange", this); } 
    getName() { return this._name; }
    getTrackCount() { return this._tracks.length; }
    setSelected(i) {
        if (i < 0 || i >= this._tracks.length) return;
        if (this._tracks[this._selected].isRecording()) return;  // can't change the selection while recording, unless you stop first!
        this._selected = i;
        this.fireEvent("onSelectionChange", this);
    }
    getSelected() { return this._selected; }
    getSoloTrack() {
        // returns the current solo track, or -1 if none is present
        for (let i = 0; i < this._tracks.length; i++) {
            if (this._tracks.getProperty("solo")) return i;
        }
        return -1;
    }
    setSoloTrack(i) {
        // sets the solo track, or clears the solo feature if i<0
        if (i < 0) {
            this._clearSoloFlags(true, false);
        }
        if (i >= this._tracks.length) return;
        this._clearSoloFlags(true, true);
        this._tracks[i].setProperty("solo", true);
        this._setSoloFlags();
        this.fireEvent("onChange", this);
    }
    addTrack(t) { 
        this._tracks.push(t); 
        this._tracks[this._tracks.length-1].setProperty("song", this);
        this.fireEvent("onChange", this); 
    }
    clear() { this._tracks = [ ]; this.fireEvent("onChange", this); }
    deleteTrack(i) {
        if (i < 0 || i >= this._tracks.length) return;
        if (this._selected > i) this._selected--;
        this._tracks.splice(i,1);
        this.fireEvent("onChange", this);
    }
    addDefaultChordAndRhythm() {
        // Creates a default chord and rhythm track for a song (typically you do this after creating the song).
        let rhythmTrack = new Track();
        rhythmTrack.setProperty("trackType", Track.TR_RHYTHM);
        rhythmTrack.autoAccompany.aaType = AutoAccompanySettings.AA_NOCHANGE;
        let chordTrack = new Track();
        chordTrack.setProperty("trackType", Track.TR_CHORD);
        chordTrack.autoAccompany.aaType = AutoAccompanySettings.AA_NOCHANGE;
        this.addTrack(rhythmTrack);
        this.addTrack(chordTrack);
    }
    addDefaultInstrumentTracks() {
        // Create default instrument tracks for a song, that make it easier to set up
        // recording.
        let drumTrack = new Track();
        drumTrack.setProperty("playbackChannel",9);
        drumTrack.setProperty("instrument",0);
        drumTrack.autoAccompany.aaType = AutoAccompanySettings.AA_NOCHANGE;
        this.addTrack(drumTrack);
        let bassTrack = new Track();
        bassTrack.setProperty("playbackChannel",2);
        bassTrack.setProperty("instrument",32);   // acoustic bass
        bassTrack.autoAccompany.aaType = AutoAccompanySettings.AA_SCALE;
        bassTrack.autoAccompany.aaKey = 0;  // bass adjusts auto-accompaniment based on the C Major Scale
        bassTrack.autoAccompany.aaScale = "MAJOR";
        this.addTrack(bassTrack);
        let pianoTrack = new Track();
        pianoTrack.setProperty("playbackChannel",3);
        pianoTrack.setProperty("instrument",0);     // piano overlays bass-- do the same basic pattern in C major, then the melody track (saxophone) can control both piano and bass with the accompaniment keyboard.
        pianoTrack.autoAccompany = bassTrack.autoAccompany.clone();
        this.addTrack(pianoTrack);
        let hornTrack = new Track();
        hornTrack.setProperty("playbackChannel",4);
        hornTrack.setProperty("instrument", 65);  // alto sax
        hornTrack.autoAccompany.aaType = AutoAccompanySettings.AA_NOCHANGE;
        this.addTrack(hornTrack);
    }

    getOpenChannel() {
        // Determines an open channel in the song.  Returns -1 if all channels are in use.
        // First, scan through all tracks to see what channels they use
        let allChannels = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];  // 16 channels, an eternal MIDI Constant!
        for (let i = 0; i < this._tracks.length; i++) {
            // each track can use multiple channels if it doesn't have the channel output forced
            let trackChannels = this._tracks.getChannelsUsed();
            for (let j = 0; j < trackChannels.length; j++)  {
                if (trackChannels[j] >= 0 && trackChannels[j] < 16) 
                    allChannels[trackChannels[j]] = 1;
            }
        }
        // now scan for an open one (still zero)
        for (let i = 0; i < 16; i++) {
            if (allChannels[i]===0) return i;
        }
        return -1;
    }

    addTrackOnOpenChannel() {
        // Creates a track and adds it to the song, then assigns an open channel.
        // Returns the track, or null if no channel is available to add a track.
        
    }

    duration() {
        // gets the duration of the song, which is the duration of all non-infinite tracks.
        // (Infinite tracks are things like repeating drum patterns, which just keep going until
        // the rest of the song is over.)
        let minDuration = 0;
        for (let i = 0; i < this._tracks.length; i++) {
            let thisDuration = this._tracks[i].duration();
            if (thisDuration === Infinity) continue;
            if (thisDuration > minDuration) minDuration = thisDuration;
        }
        return minDuration;
    }

    resetMediaState() {
        // Resets the media state (playback/record status and position) for all tracks.
        for (let i = 0; i < this._tracks.length; i++) this._tracks[i].resetMediaState();
    }

    seek(newPosition) {
        // Seeks all tracks to the given position.
        for (let i = 0; i < this._tracks.length; i++) this._tracks[i].seek(newPosition);
    }

    rewind() {
        // Rewinds all tracks.
        for (let i = 0; i < this._tracks.length; i++) this._tracks[i].rewind();
    }

    playTrackList(trackIndexList, cutInfiniteTracksOffFlag = true) {
        // Plays the track indices in the supplied list, starting at each track's current position.  
        this._setSoloFlags();  // make sure these are set right based on the solo flag
        let songDuration = this.duration();
        for (let i = 0; i < this._tracks.length; i++) {
            if (trackIndexList.indexOf(i) === -1) continue;
            //-- we set the end position to the song duration, so infinitely repeating
            //-- tracks will stop when the rest of the song is over!
            //-- BUT-- you set the flag false if you are play/recording, so the infinite
            //   tracks keep going until you stop recording.
            if (cutInfiniteTracksOffFlag) this._tracks[i].setEndPosition(songDuration);
            this._tracks[i].play();
        }
    }

    recordEvent(eventType, channel, noteNumber, velocity, extra) {
        // Sends a record event to the current track
        this._tracks[this._selected].recordEvent(eventType,channel,noteNumber,velocity,extra);
    }

    startRecording() {
        this._tracks[this._selected].startRecording();
    }

    startRecordingOnTrack(i) {
        //-- starts recording on any track; returns -1 if track is not valid.
        if (i < 0 || i >= this._tracks.length) return -1;
        this._tracks[i].startRecording();
        return 0;
    }

    stopRecording() {
        //-- stop recording on the current track
        this._tracks[this._selected].stopRecording();
        //-- you may have been playing too.  Stop that!
        this.stop();
    }

    playRecord() {
        // Plays all tracks except the selected one, on which we will record new notes.
        // Always starts from the top.
        this.rewind();
        let tracksToPlay = [ ];
        for (let i = 0; i < this._tracks.length; i++) 
            { if (i!==this._selected) tracksToPlay.push(i); }
        this.startRecording();
        this.playTrackList(tracksToPlay);
    }

    nextOpenTrack() {
        // Looks past the current selected track to find the next track with no notes, where
        // we can record if we are doing "record next track".  Returns -1 if none available.
        // Does not include chord or bar tracks, only regular tracks.
        for (let i = this._selected + 1; i < this._tracks.length; i++) {
            let thisTrackType = this._tracks[i].getProperty("trackType");
            if (thisTrackType != Track.TR_REGULAR) continue;
            if (this._tracks[i].getNoteCount() > 0) continue;
            return i;
        }
        return -1;
    }

    recordNext() {
        // While recording and playing, stop recording the current track, start playing it
        // on infinite repeat starting from the first note (remove any starting wait time),
        // and start recording on the next open track.  Has no effect if there are no next open
        // tracks, or the current track is not recording.  By the way, if other tracks are playing,
        // they just keep on going.
        // Returns "" on success or an error message.
        if (!this._tracks[this._select].isRecording()) return "Not currently recording";
        let nextTrackIndex = this.nextOpenTrack();        
        if (nextTrackIndex<0) return "No empty tracks to record to";
        let oldTrack = this._tracks[this._select];
        this.stopRecording();
        if (oldTrack.getNoteCount() > 0) {
            // delete the waiting at the start, if there is any
            let oldTrackFirstNote = oldTrack.getNote(0);
            if (oldTrackFirstNote.noteType === Note.NT_WAIT) oldTrack.deleteNote(0);
        }
        if (oldTrack.getNoteCount() > 0) {
            // if there are still any notes, push a repeat on the end that repeats the whole thing,
            // then start playing that track from the start.
            let oldTrackFirstNote = oldTrack.getNote(0);
            oldTrack.pushNote(new Note(0, Note.NT_REPEAT, 0, 0, 0, oldTrackFirstNote.id, Infinity));
            oldTrack.resetMediaState(); oldTrack.rewind();
            oldTrack.play();
        }
        this.setSelected(nextTrackIndex);
        this.startRecording();
        this._tracks[nextTrackIndex].startRecording();
        return "";
    }

    play() {
        // Plays all tracks
        let tracksToPlay = [ ];
        for (let i = 0; i < this._tracks.length; i++) { tracksToPlay.push(i); }
        this.playTrackList(tracksToPlay);
    }

    stop() {
        // Force-stops (or pauses) all tracks.
        for (let i = 0; i < this._tracks.length; i++) this._tracks[i].stop();
    }


}

