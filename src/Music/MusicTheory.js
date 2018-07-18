//
//  Music Theory Routines (chord and scale analysis, etc.) for Musical Playground
//  (An instance gets assigned as a global by the App, for use by all modules)
//  Created 7/17/2018 by Dave White
//  MIT License
//

export class MTheoryClass {
    constructor() {
        let thisObject = this;

        //-- Reference to different chord and scale types.  You can use them as dropdown lists by only
        //-- iterating the property names, or you can use the values, which are arrays of 
        //-- semitone offsets from root.
        //-- Use longChordNames for more descriptive drop-down boxes.
        thisObject.chords = {
            "M": [0, 4, 7],
            "m": [0, 3, 7],
            "M7": [0, 4, 7, 11],
            "7": [0, 4, 7, 10],
            "dim": [0, 3, 6],
            "dim7": [0, 3, 6, 9],
            "aug": [0, 4, 8],
            "aug7": [0, 4, 8, 11],
            "M6": [0, 4, 7, 9],
            "m6": [0, 3, 7, 9],
            "07": [0, 3, 6, 10],
            "sus4": [0, 5, 7],
            "sus2": [0, 2, 7]
        };
        thisObject.longChordNames = {
            "Major": "M", "Minor": "m", "M7": "Major 7th", "7th": "7",
            "Diminished": "dim", "Diminished 7th": "dim7", "Augmented": "aug",
            "Augmented 7th": "aug7", "Major 6th": "M6", "Minor 6th": "m6",
            "Half-Dimished 7th": "07", "Suspended 4": "sus4", "Suspended 2": "sus2"
        };
        thisObject.scales = [
            //--- Common diatonic scales, in order of most likelihood in analyzing a series of notes.
            ["Major", [0,2,4,5,7,9,11] ],
            ["Minor (natural)", [0,2,3,5,7,8,10] ],
            ["Minor (harmonic)", [0,2,3,5,7,8,11] ],
            ["Blues (six-note)", [0,3,5,6,7,10]],
            ["Blues (seven-note)", [0,2,3,5,6,7,10]],
            ["Ionian (1)", [0,2,4,5,7,9,11] ],
            ["Dorian (2)", [0,2,3,5,7,9,10] ],
            ["Phyrgian (3)", [0,1,3,5,7,8,10] ],
            ["Lydian (4)", [0,2,4,6,7,9,11] ],
            ["Myxolydian (5)", [0,2,4,5,7,9,10] ],
            ["Aeolian (6)", [0,2,3,5,7,8,10] ],
            ["Locrian (7)", [0,1,3,5,6,8,10] ],
            ["Chromatic", [0,1,2,3,4,5,6,7,8,9,10,11]]
        ];
        thisObject.getScale = function(scaleName) {
            // Returns the scale by the given name.
            for (let i = 0; i < thisObject.scales.length; i++) {
                if (thisObject.scales[i][0] === scaleName) return thisObject.scales[i][1];
            }
            return [];
        }
    }
}

export let MTheory = new MTheoryClass();
