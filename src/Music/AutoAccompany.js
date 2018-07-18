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
    constructor() {
        let thisObject = this;

        // Types of auto-accompaniment
        thisObject.AA_NOCHANGE = 0        // No change: accompaniment keyboard disabled / not used.
                                    // Entire accompaniment of song was played out manually.
                                    // (thisObject version can benefit however from analyzing the chord
                                    // progression and showing what chord is upcoming for improvisation...)
        thisObject.AA_SCALE = 1           // Notes transposed to corresponding notes along a scale
                                    // (Accompaniment can be one key, since it can't distinguish different chords)
                                    // (Chromatic transposition is included since Chromatic is an available scale)
        thisObject.AA_CHORD = 2           // Notes translated to corresponding notes within a chord
                                    // (Accompaniment can be any new chord with same # of notes or less,
                                    // which will translate the accompaniment into corresponding chord notes.)

        // Properties to guide auto-accompaniment
        thisObject.aaType = thisObject.AA_SCALE;     // type of auto-accompaniment
        thisObject.aaKey = 0;             // 0 = C, 1 = C#, 2 = D, etc. up to 11: key of the scale or chord
        thisObject.aaSelection = "Major"; // default scale is C Major.  aaSelection also stores Chord
                                    // if a Chord was selected.
        thisObject.copyTrack = null;    // this track is created as you play with auto-accompaniment backing
                                        // (only if aaType != AA_NOCHANGE).  It contains all the notes from
                                        // the original source track, transposed to their new form, and the
                                        // UI can disable the original (probably "repeating") track and play
                                        // the new one, with the result being that the player's chord changes
                                        // have been incorporated into the song and additional tracks can be
                                        // recorded on top of them.
        
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
            //  Records thisObject note number (raw MIDI note number) as being on, and if enough
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
    }
}