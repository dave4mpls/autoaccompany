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
            // First index is internal name to use in the program, second is display name, third is series of note offets making up the scale.
            ["MAJOR","Major", [0,2,4,5,7,9,11] ],
            ["MINOR_N","Minor (natural)", [0,2,3,5,7,8,10] ],
            ["MINOR_H","Minor (harmonic)", [0,2,3,5,7,8,11] ],
            ["BLUES_6","Blues (six-note)", [0,3,5,6,7,10]],
            ["BLUES_7","Blues (seven-note)", [0,2,3,5,6,7,10]],
            ["IONIAN","Ionian (1)", [0,2,4,5,7,9,11] ],
            ["DORIAN","Dorian (2)", [0,2,3,5,7,9,10] ],
            ["PHYRGIAN","Phyrgian (3)", [0,1,3,5,7,8,10] ],
            ["LYDIAN","Lydian (4)", [0,2,4,6,7,9,11] ],
            ["MYXOLYDIAN","Myxolydian (5)", [0,2,4,5,7,9,10] ],
            ["AEOLIAN","Aeolian (6)", [0,2,3,5,7,8,10] ],
            ["LOCRIAN","Locrian (7)", [0,1,3,5,6,8,10] ],
            ["CHROMATIC","Chromatic", [0,1,2,3,4,5,6,7,8,9,10,11]]
        ];
        thisObject.getScale = function(scaleName) {
            // Returns the scale by the given internal name.
            for (let i = 0; i < thisObject.scales.length; i++) {
                if (thisObject.scales[i][0] === scaleName) return thisObject.scales[i][2];
            }
            return [];
        };
        thisObject.scaleAsSteps = function(thisScale) {
            // converts a scale array into a step instruction array showing intervals in a scale
            // (e.g. the original array tells you which note number is in each step of the scale,
            // the step array tells you how many half-steps to move).
            let steps = [ ]; let lastStep = 0;
            for (let i = 0; i < thisScale.length; i++) 
                { steps.push(thisScale[i] - (i===0?0:thisScale[i-1])); lastStep = thisScale[i]; }
            steps.push(12-lastStep);
            return steps;
        }
        thisObject.whichStep = function(thisScale, rootNote, thisNote) {
            // Which step of the scale is the given note on, assuming the scale is rooted
            // in rootNote?  Returns an index into thisScale, or -1 if not in the scale.
            let rootMod = rootNote % 12; let thisMod = thisNote % 12;
            for (let i = 0; i < thisScale.length; i++) {
                if (((thisScale[i] + rootMod) % 12) === thisMod) return i;
            }
            return -1;
        }
        thisObject.nextStep = function(thisArray, i, direction) {
            // Goes to the next step in the scale OR step array, wrapping appropriately.
            // Direction is -1 for descending, 1 for ascending.
            i = i + direction;
            if (i < 0) i = thisArray.length - 1;
            if (i > thisArray.length) i = 0;
            return i;
        }
        thisObject.notePlusSteps = function(thisScale,rootNote, startNote,numberOfSteps) {
            // Moves a certain number of scale steps in the given scale starting at the
            // given root note (key), then returns the destination note.  Returns -1 on error
            // (e.g. original note not on the scale).
            let steps = thisObject.scaleAsSteps(thisScale);
            let direction = Math.sign(numberOfSteps); let numberOfSteps = Math.abs(numberOfSteps);
            let currentIndex = thisObject.whichStep(thisScale, rootNote, startNote); 
            if (currentIndex === -1) return -1;
            if (direction < 0) currentIndex = thisObject.nextStep(steps, currentIndex, direction);
            let newNote = startNote;
            for (let i = 0; i < numberOfSteps; i++) {
                newNote += direction * steps[currentIndex];
                currentIndex = thisObject.nextStep(steps, currentIndex, direction); 
            }
            return newNote;
        }
        thisObject.howManySteps = function(thisScale, rootNote, startNote, destinationNote) {
            // How many whole-steps and half-steps from start note to destination note?
            // Returns a two-item array where the first item is the whole steps (signed) and the
            // second is the half-steps (also signed, same direction).  Returns null on error.
            // The root note specifies which key we are in.
            if (startNote === destinationNote) return [0,0];
            let steps = thisObject.scaleAsSteps(thisScale);
            let direction = (startNote > destinationNote) ? -1 : 1;
            let currentIndex = thisObject.whichStep(thisScale, rootNote, startNote);
            if (currentIndex === -1) return null;
            if (direction < 0) currentIndex = thisObject.nextStep(steps, currentIndex, direction);
            let currentNote = startNote; let lastNote = startNote; let stepsTaken = 0;
            while ((direction === 1 && currentNote < destinationNote) || (direction === -1 && currentNote > destinationNote)) {
                lastNote = currentNote; stepsTaken += direction;
                currentNote += direction * steps[currentIndex];
                currentIndex = thisObject.nextStep(steps, currentIndex, direction);
            }
            let halfSteps = (currentNote === destinationNote) ? 0 : (direction * Math.abs(currentNote - lastNote));
            return [ stepsTaken, halfSteps ];
        }
        thisObject.transposeOnScale = function(noteNumber, thisScale, rootNote, accompanimentNoteNumber) {
            // Given a played note, a scale, a root Note, and a new accompaniment note, returns the corresponding
            // new note.  On error return the original note if you think it would sound good to play,
            // or -1 if you don't want a note to be played.  The way this works is it just finds the
            // scale steps between root and accompaniment, and adds those same scale steps to the note.
            // This should make the octaves work out by themselves.

            // first, how many scale steps (and half-steps) from root to the note to be played?
            let nScaleSteps = thisObject.howManySteps(thisScale, rootNote, rootNote, noteNumber);
            if (nScaleSteps===null) return noteNumber;  // root can't be off scale, but note can (hence the half-step return in array element 1).
            // now, since the accompaniment note is the new root, add the delta from root to note, to the accompaniment note.
            // Keep in mind that although the accompaniment note is the new root NOTE, the SCALE it uses is still
            // based on the original root (it's in the key of that root!)
            let newNote = thisObject.notePlusSteps(thisScale, rootNote, accompanimentNoteNumber, nScaleSteps[0]);
            if (newNote === -1) return noteNumber;  // could happen if accompaniment note is not in the scale
            // Now, add the half-steps.  Return the new note!
            newNote += nScaleSteps[1];
            return newNote;
        }
    }
}

export let MTheory = new MTheoryClass();
