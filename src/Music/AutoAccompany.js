//
//  AutoAccompany Settings Transmission and Storage
//  Indicates type of modification that will happen to an accompaniment track, in real-time, as it
//  plays back and is interrupted by Accompaniment Notes.
//  Created 7/17/2018 by Dave White
//  MIT License
//

//  depends on music-theoretical knowledge
import { MTheory } from './MusicTheory.js';

export class AutoAccompanySettings {
    static AA_NOCHANGE = 0        // No change: accompaniment keyboard disabled / not used.
    // Entire accompaniment of song was played out manually.
    // (thisObject version can benefit however from analyzing the chord
    // progression and showing what chord is upcoming for improvisation...)
    static AA_SCALE = 1           // Notes transposed to corresponding notes along a scale
        // (Accompaniment can be one key, since it can't distinguish different chords)
        // (Chromatic transposition is included since Chromatic is an available scale)
    static AA_CHORD = 2           // Notes translated to corresponding notes within a chord
        // (Accompaniment can be any new chord with same # of notes or less,
        // which will translate the accompaniment into corresponding chord notes.)
    constructor() {
        let thisObject = this;

        // Types of auto-accompaniment

        // Properties to guide auto-accompaniment
        thisObject.aaType = thisObject.AA_NOCHANGE;     // type of auto-accompaniment, defaults to none (e.g., melody track)
        thisObject.aaRootNote = 48;             // The root note specifies both the key (48 is C below middle C) and the octave.  If the accompaniment key is above or below the root note, the accompaniment line is transposed accordingly.
        thisObject.aaScale = "MAJOR"; // default scale is C Major.  
        thisObject.aaChord = "M";   // default chord is major.        
        // Properties for maintaining accompaniment keys
        thisObject.downKeys = [ ];        // list of keys maintained by aaOn and aaOff realtime routines
        thisObject.usedKeys = [ ];        // keys being used 

        // Internal methods.
        thisObject.checkDownKeys = function(lastNoteNumberDown) {
            // Checks the current Down Keys to see if they match a note or chord 
            // 
        }

        // Methods for recording accompaniment keys
        thisObject.aaStart = function() {
            //  Starts auto-accompaniment process for thisObject track.
            thisObject.downKeys = [ ];
            thisObject.usedKeys = [ ];
        }

        thisObject.aaOn = function(noteNumber) {
            //  Records this note number (raw MIDI note number) as being on, and if enough
            //  keys have been pressed, change the accompaniment.
            if (thisObject.downKeys.indexOf(noteNumber) === -1) {
                thisObject.downKeys.push(noteNumber);
                thisObject.downKeys.sort();
                thisObject.checkDownKeys(noteNumber);     
                        // here is where we check for chord changes 
            }
        }

        thisObject.aaOff = function(noteNumber) {
            // Records turning-off of thisObject note number.
            if (thisObject.downKeys.indexOf(noteNumber) !== -1) {
                let i = thisObject.downKeys.indexOf(noteNumber);
                thisObject.downKeys.splice(i,1);
            }
        }

        thisObject.clone = function() {
            let newAA = new AutoAccompanySettings();
            for (let thisProperty in thisObject) {
                newAA[thisProperty] = thisObject[thisProperty];
            }
            newAA.downKeys = [ ];
            newAA.usedKeys = [ ];
            return newAA;
        }
        thisObject.save = function() {
            return JSON.stringify(thisObject);
        }
    }
    static load(sourceObject) {
        let newAA = new AutoAccompanySettings();
        for (let thisProperty in sourceObject) { 
            newAA[thisProperty] = sourceObject[thisProperty];
        }
        return newAA;
    }
}