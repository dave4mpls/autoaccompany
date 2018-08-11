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
import { MTheory } from './MusicTheory.js';
import { AutoAccompanySettings } from './AutoAccompany.js';

export class Song {
    constructor() {
        //--- each song has a unique ID, tracked by keeping a Next ID in local storage
        //--- persistently.  This way, tracks and song data can be stored in separate keys
        //--- in local storage, based on the song ID.
        let thisObject = this;
        let uniqueSongId = localStorage.getItem("nextSongId");
        if (uniqueSongId===null) {
            uniqueSongId = 1;
            this._id = uniqueSongId;
            uniqueSongId++;
            localStorage.setItem("nextSongId", "" + uniqueSongId);
        }
        else {
            uniqueSongId = parseInt(uniqueSongId,10);
            this._id = uniqueSongId;
            uniqueSongId++;
            localStorage.setItem("nextSongId", "" + uniqueSongId);
        }
        //--- now add various basic properties
        this._name = "Untitled " + this._id;
        this._selected = 0;     // selected track
        this._loading = false;  // true while loading from storage -- prevents loop of saving changes when loading changes.
        this._recordingOnTracks = [ ];  // array of track indices we are recording on.
        this._tracks = [ ];     // the actual track objects
        //--- hooks for other routines to link into the record/playback process
        //    similar to for Track
        this.events = new EventHandler();
        this.events.addEventMethods(this, this.events);
        this._versionNumber = 0;     // increases each time the song is changed; can be used
                                    // in React state to ensure proper updates.
        this.attachEventHandler("onChange",function(t) {
            t._versionNumber++;
            if (!thisObject._loading) thisObject.save();  
                // On change to the song, persist it to storage.
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
    getId() { return this._id; }
    getTrack(i) { return this._tracks[i]; }
    getTrackCount() { return this._tracks.length; }
    getVersionNumber() { return this._versionNumber; }
    setSelected(i) {
        if (i < 0 || i >= this._tracks.length) return;
        if (this._tracks[this._selected].isRecording()) return;  // can't change the selection while recording, unless you stop first!
        this._selected = i;
        this.fireEvent("onChange", this);
        this.fireEvent("onSelectionChange", this);
    }
    getSelected() { return this._selected; }
    getRecordingTracks() { return this._recordingOnTracks; } // tracks currently being recorded
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
    handleTrackChange(thisTrack) {
        //-- when the track is changed, persist the whole song to local storage
        //-- (except if any tracks are recording-- we persist after recording is over to
        //-- ensure minimum latency).
        let thisSong = thisTrack.getProperty("song");
        if (thisSong._recordingOnTracks.length === 0)
            thisSong.save();
    }
    addTrack(t) {
        this._tracks.push(t); 
        t.setProperty("song", this);
        t.removeEventHandler("onChange", this.handleTrackChange);  // remove the event handler if it's already there
        t.attachEventHandler("onChange", this.handleTrackChange);  // then add it-- it saves the song when the track changes
        this.fireEvent("onChange", this);   // now fire OUR change event.
    }
    clear() { this._tracks = [ ]; this.fireEvent("onChange", this); }
    deleteTrack(i) {
        // deletes a track, returns 0 on success or -1 on failure, including: can't delete during recording
        if (i < 0 || i >= this._tracks.length) return -1;
        if (this._recordingOnTracks.length > 0) return -1;
        if (this._selected > i) this._selected--;
        this._tracks.splice(i,1);
        this.fireEvent("onChange", this);
        return 0;
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
        bassTrack.autoAccompany.aaType = AutoAccompanySettings.AA_AUTO;
        bassTrack.autoAccompany.aaKey = 0;  // bass adjusts auto-accompaniment based on autodetermining the accompaniment style based on what you played.
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
        let allChannels = [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0];  
            // 16 channels, an eternal MIDI Constant!
            // First two are reserved for keyboard input (both MIDI and virtual).
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
        let newChannel = this.getOpenChannel();
        if (newChannel < 0) return null;
        let newTrack = new Track();
        newTrack.setProperty("playbackChannel", newChannel);
        this.addTrack(newTrack);
        return newTrack;
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
        this._recordingOnTracks = [ ];
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

    recordEvent(destinationIndex, eventType, channel, noteNumber, velocity, extra) {
        // Sends a record event to a recording track.  The first one you record on
        // gets a destination index of 0 (typically the main recording channel).  If you
        // open up another one (say, due to someone playing a note on the second virtual keyboard),
        // then that one will be 1.  The event will be dropped if the index is out of range.
        // Returns -1 if the event was dropped, 0 if it was sent to the track for recording.
        if (destinationIndex < 0 || destinationIndex >= this._recordingOnTracks.length) return -1;
        this._tracks[this._recordingOnTracks[destinationIndex]].recordEvent(eventType,channel,noteNumber,velocity,extra);
        return 0;
    }

    startRecordingOnTrack(i) {
        //-- starts recording on any track; returns -1 if track is not valid.
        //-- Pushes recording tracks onto queue so we can stop them all later.
        if (i < 0 || i >= this._tracks.length) return -1;
        if (this._recordingOnTracks.indexOf(i) >= 0) return 0;  // already recording
        this._recordingOnTracks.push(i);  // add to our list of tracks to stop when stop is called.
        this._tracks[i].startRecording();
        return 0;
    }

    startRecording() {
        // Starts recording on the selected track.
        this.startRecordingOnTrack(this._selected);
    }

    stopRecording() {
        //-- stop recording on all tracks currently recording.
        for (let i = 0; i < this._recordingOnTracks.length; i++)
            this._tracks[this._recordingOnTracks[i]].stopRecording();
        this._recordingOnTracks = [ ];
        //-- you may have been playing too.  Stop that!
        this.stop();
        //-- when we finish recording, we also persist to storage.
        //-- (But not during, which would worsen latency.)
        this.save();
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
            if (thisTrackType !== Track.TR_REGULAR) continue;
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
        //
        // To make this work the best so you can improvise multiple tracks in a row, we also
        // have to get the timing right.  If the accompaniment (e.g. bass) track was a little bit
        // off from the drum track, then the difference would compound over several measures until
        // they were way off during the recording of the melody.  So: we adjust the speed of the track
        // so it exactly matches the duration of the previous track.
        //
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
            // Before we start the "old" track (just finished) playing, we need to make sure its
            // speed is adjusted to play at an even multiple of whatever was laid down before.
            if (this._selected > 0 && this._tracks[this._selected-1].getProperty("trackType")===Track.TR_REGULAR) {
                // make wrapper objects that can point to the tracks and their measured durations
                let track1 = { track: oldTrack }; let track2 = { track: this._tracks[this._selected-1] };
                track1["duration"] = track1["track"].duration(false);
                track2["duration"] = track2["track"].duration(false);
                // if they're the same we are done
                if (track1["duration"]===track2["duration"]) { }
                else {
                    // figure out which one is shorter
                    let shortestTrack = null, longestTrack = null;
                    if (track1["duration"] < track2["duration"]) { shortestTrack = track1; longestTrack = track2; }
                    else { shortestTrack = track2; longestTrack = track1; }
                    // now search for a common multiple to put the shortest track within range of the longest one
                    // this is because, say, the drum track might have gone for two measures and the bass track for one, etc.
                    // so as long as we are an integral multiple of the previous track with our speed adjustment, we're fine.
                    // we use a wide, 5% margin to catch errors in rhythm -- this means we are willing to speed up/slow down
                    // by up to 5% (until I decide that sounds bad.. I made it wide in case you're recording really small parts.
                    // For most parts, you will be off by way less than 5%, even if you have bad rhythm!
                    let errorMargin = longestTrack["duration"] * 0.05;
                    let nearestMultiple = -1;
                    for (let i = 1; i < 256; i++) {  // Most likely numbers are 1,2,3,4,8, etc., with heavy emphasis on 1 and 2, but in case somebody does a whole song's chord progression in one track and one measure in the other...
                        if (shortestTrack["duration"] * i >= longestTrack["duration"]-errorMargin && shortestTrack["duration"] <= longestTrack["duration"]+errorMargin) {
                            nearestMultiple = i; break;
                        }
                    }
                    // Okay, so, we only adjust the speed if we found a nearest multiple, and
                    // we only adjust the most recent track (track1), and we do it such that it will play at
                    // exactly a multiple or even division of the previous track.
                    let expectedDuration = 0;
                    if (nearestMultiple !== -1) {
                        if (track1===shortestTrack) 
                            expectedDuration = longestTrack["duration"]/nearestMultiple;
                        else
                            expectedDuration = longestTrack["duration"]*nearestMultiple;
                        track1["track"].setProperty("speed", track1["track"].getProperty("speed")*expectedDuration/track1["duration"]);
                    }
                }
            }
            // now we are ready to play.
        }
        this.setSelected(nextTrackIndex);
        // playRecord will rewind all the tracks and start them playing at once, minimizing timing errors.
        this.playRecord();
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

    //
    //  Persistence Routines
    //
    shallowCopy(destinationObject) {
        // Returns all the direct properties of the song as an object.
        // Copies them into the destination object (supply { } if you want a new one).
        for (let thisProperty in this) {
            if (thisProperty[0] !== "_") continue;
            if (thisProperty === "_tracks") continue;
            if (thisProperty === "_recordingOnTracks") continue;
            if (thisProperty === "_loading") continue;
            destinationObject[thisProperty] = this[thisProperty];
        }
        return destinationObject;
    }

    clone() {
        // Returns a full clone of a song.
        let newSong = new Song();
        this.shallowCopy(newSong);
        for (let i = 0; i < this._tracks.length; i++) {
            newSong.addTrack(this._tracks[i].clone());
        }
        newSong.resetMediaState();
        return newSong;
    }

    deletePersistedSong() {
        // deletes the persisted copy of this song.  
        // Use when removing a song; also used by Save to ensure that shortening a song's
        // tracks frees up appropriate local storage space.
        let savedTrackCount = localStorage.getItem("SongTrackCount_" + this._id);
        if (savedTrackCount===null) return;  // not persisted, so nothing to do
        for (let i = 0; i < savedTrackCount; i++) 
            localStorage.removeItem("SongTrack_" + this._id + "_" + i);
        localStorage.removeItem("SongHeader_" + this._id);
        localStorage.removeItem("SongTrackCount_" + this._id)
    }

    save() {
        // Saves the song to its designated location in Local Storage
        // (based on its unique ID number set at creation).
        this.deletePersistedSong();  // remove the old one
        let songHeader = this.shallowCopy({ });
        localStorage.setItem("SongHeader_" + this._id, JSON.stringify(songHeader));
        localStorage.setItem("SongTrackCount_" + this._id, this._tracks.length);
        for (let i = 0; i < this._tracks.length; i++) { 
            localStorage.setItem("SongTrack_" + this._id + "_" + i, this._tracks[i].save());
        }
    }

    static load(songId) {
        // Loads a song with a particular ID number from Local Storage into a Song object 
        // and returns the Song object, or null if it does not exist.
        // Static method, so use this: let newSong = Song.load(songId).
        if (localStorage.getItem("SongHeader_" + songId) === null) return null;
        if (localStorage.getItem("SongTrackCount_" + songId) === null) return null;
           let newSong = new Song();
        newSong._loading = true;
        newSong.shallowCopy.call(JSON.parse(localStorage.getItem("SongHeader_" + songId)),newSong);
        for (let i = 0; i < parseInt(localStorage.getItem("SongTrackCount_" + songId),10); i++) {
            let trackData = localStorage.getItem("SongTrack_" + songId + "_" + i);
            if (trackData === null) continue;
            newSong.addTrack(Track.load(trackData));
        }
        newSong.resetMediaState();
        newSong._loading = false;
        return newSong;
    }

}

