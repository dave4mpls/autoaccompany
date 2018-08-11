//
//  MIDI Track Storage for Musical Playground
//  Highest level of storage, containing an array of Songs, each of which contain Tracks, 
//  which contain Notes.
//  Songs are basically independent, except that the routines in here can load and save the
//  whole caboodle from storage (typically used on open; songs save themselves while being processed
//  so there is no need to save all the songs on exit).  There are also routines to create the
//  new default songs, and probably will be some to select a current song (the one whose tab
//  you clicked on, that you are currently working on).  Maybe a clipboard for copy/paste later on?
//
//  Created 8/3/2018 by Dave White
//
//  MIT License
//

import { EventHandler } from '../EventHandler.js';
import { Song } from './Song.js';

export class TrackStorage {
    //  Track storage is quite simple: it is a song array.  It can load and save the songs
    //  from Local Storage too.
    constructor() {
        let thisObject = this;
        this.songs = [ ];
        this.events = new EventHandler();
        this.events.addEventMethods(this, this.events);
        this._versionNumber = 0;     // increases each time the song is changed; can be used
                                    // in React state to ensure proper updates.
        this.attachEventHandler("onChange",function(t) {
            t._versionNumber++;
            thisObject.save();  
                // On change to the song, persist it to storage.
            // Since this onChange handler is attached first, the caller's onChange handler
            // will get the new version number.
        });
    }

    idList() {
        // Returns a list of all the unique-ID-numbers of the songs.
        let outArray = [ ];
        for (let i = 0; i < this.songs.length; i++) {
            outArray.push(this.songs[i].getId());
        }
        return outArray;
    }

    load() {
        // Loads all songs from storage.
        this.songs = [ ];
        let idList = localStorage.getItem("songIdList");
        if (idList===null) { localStorage.setItem("songIdList", "[]"); return; }
        idList = JSON.parse(idList);
        for (let i = 0; i < idList.length; i++) {
            let retrievedSong = Song.load(idList[i]);
            this.songs.push(retrievedSong);
        }
        this.selected = 0;
    }

    saveIdList() {
        // Whenever a song is added or deleted we call this, to update the ID List that
        // helps us locate the songs in local storage.
        localStorage.setItem("songIdList", JSON.stringify(this.idList()));
    }

    save() {
        // Saves all the songs and the list of song ID's.
        this.saveIdList();
        for (let i = 0; i < this.songs.length; i++) {
            this.songs[i].save();
        }
    }

    deleteSong(i) {
        if (i < 0 || i >= this.songs.length) return;
        this.songs[i].deletePersistedSong();
        this.songs.splice(i,1);
        if (this.selected > i) this.selected--;
        this.fireEvent("onChange",this);
    }

    deleteSongObject(s) {
        for (let i = 0; i < this.songs.length; i++) {
            if (s===this.songs[i]) { this.deleteSong(i); return;}
        }
    }

    select(i) {
        if (i < 0 || i > this.songs.length) return;
        this.selected = i;
        this.fireEvent("onChange", this);
        this.fireEvent("onSelectionChange", this);
    }

    addNewSong() {
        let s = new Song();
        s.addDefaultChordAndRhythm();
        s.addDefaultInstrumentTracks();
        this.songs.push(s);
        this.selected = this.songs.length - 1;
        this.fireEvent("onChange", this);
        this.fireEvent("onSelectionChange", this);
    }
}

export let TrackList = new TrackStorage();
