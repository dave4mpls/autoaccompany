//
//  Music Theory Routines (chord and scale analysis, etc.) for Musical Playground
//  (An instance gets assigned as a global by the App, for use by all modules)
//  Created 7/17/2018 by Dave White
//  MIT License
//

export class MTheoryClass {
    constructor() {
        let thisObject = this;

        //-- Reference to different chord and scale types.  
        //-- Offsets represent the semitone offset from the root note for each note in the
        //-- scale or chord.
        thisObject.chords = [
            { id: "M", name: "Major", offsets: [0, 4, 7] },
            { id: "m", name: "Minor", offsets:  [0, 3, 7] },
            { id: "M7", name: "Major 7th", offsets: [0, 4, 7, 11] },
            { id: "7", name: "7th", offsets: [0, 4, 7, 10] },
            { id: "dim", name: "Diminished", offsets: [0, 3, 6] },
            { id: "dim7", name: "Diminished 7th", offsets: [0, 3, 6, 9] },
            { id: "aug", name: "Augmented", offsets: [0, 4, 8] },
            { id: "aug7", name: "Augmented 7th", offsets: [0, 4, 8, 11] },
            { id: "M6", name: "Major 6th", offsets: [0, 4, 7, 9] },
            { id: "m6", name: "Minor 6th", offsets: [0, 3, 7, 9] },
            { id: "07", name: "Half-Diminished 7th", offsets: [0, 3, 6, 10] },
            { id: "sus4", name: "Suspented 4", offsets: [0, 5, 7] },
            { id: "sus2", name: "Suspended 2", offsets: [0, 2, 7] }
        ];
        thisObject.noteNames = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
        thisObject.scales = [
            //--- Common diatonic scales, in order of most likelihood in analyzing a series of notes.
            // First index is internal name to use in the program, second is display name, third is series of note offets making up the scale.
            {id: "MAJOR", name: "Major", offsets: [0,2,4,5,7,9,11] },
            {id: "MINOR_N",name: "Minor (natural)", offsets: [0,2,3,5,7,8,10] },
            {id: "MINOR_H",name: "Minor (harmonic)", offsets: [0,2,3,5,7,8,11] },
            {id: "BLUES_6",name: "Blues (six-note)", offsets: [0,3,5,6,7,10]},
            {id: "BLUES_7",name: "Blues (seven-note)", offsets: [0,2,3,5,6,7,10]},
            {id: "IONIAN",name: "Ionian (1)", offsets: [0,2,4,5,7,9,11] },
            {id: "DORIAN",name: "Dorian (2)", offsets: [0,2,3,5,7,9,10] },
            {id: "PHYRGIAN",name: "Phyrgian (3)", offsets: [0,1,3,5,7,8,10] },
            {id: "LYDIAN",name: "Lydian (4)", offsets: [0,2,4,6,7,9,11] },
            {id: "MYXOLYDIAN",name: "Myxolydian (5)", offsets: [0,2,4,5,7,9,10] },
            {id: "AEOLIAN",name: "Aeolian (6)", offsets: [0,2,3,5,7,8,10] },
            {id: "LOCRIAN",name: "Locrian (7)", offsets: [0,1,3,5,6,8,10] },
            {id: "CHROMATIC",name: "Chromatic", offsets: [0,1,2,3,4,5,6,7,8,9,10,11]}
        ];
        thisObject.getScale = function(scaleName) {
            // Returns the scale by the given internal name.
            for (let i = 0; i < thisObject.scales.length; i++) {
                if (thisObject.scales[i].id === scaleName) return thisObject.scales[i].offsets;
            }
            return [];
        };
        thisObject.getChord = function(chordName) {
            // Returns the chord by the given internal name.
            for (let i = 0; i < thisObject.chords.length; i++) {
                if (thisObject.chords[i].id === chordName) return thisObject.chords[i].offsets;
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
            let direction = Math.sign(numberOfSteps); 
            numberOfSteps = Math.abs(numberOfSteps);
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
        thisObject.transposeOnScale = function(noteNumber, thisScale, rootNote, accompanimentNoteArray) {
            // Given a played note, a scale, a root Note, and a new accompaniment array, returns the corresponding
            // new note.  On error return the original note if you think it would sound good to play,
            // or -1 if you don't want a note to be played.  The way this works is it just finds the
            // scale steps between root and accompaniment, and adds those same scale steps to the note.
            // This should make the octaves work out by themselves.
            // The accompaniment note array is provided to match the other transpose routines, but
            // for scales, only the lowest note is used.

            if (accompanimentNoteArray.length===0) return noteNumber;
            let accompanimentNoteNumber = Math.min.apply(null, accompanimentNoteArray);
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
        thisObject.offsetsOnRoot = function(thisChord, rootNote) {
            // Returns an array of reduced (0-11) note offsets for the given chord object,
            // for the given root note.  For example, the Major Chord entry in the chord table
            // shows a C Major Chord, so if the root note is F, it will return the offsets from C
            // for an F Major Chord.
            return thisChord.offsets.map((x) => (x + (rootNote % 12) % 12));
        }
        thisObject.specificChordMatch = function(noteArray, thisChord, rootNote) {
            // Similar to matchChord below (which searches for a matching chord),
            // this sees if a particular chord object (not just a chord name!) matches the
            // notes in the note array.  It returns true or false.  
            //
            // If you change this, change matchChord; they are separate for performance reasons.
            //
            if (noteArray.length !== thisChord.offsets.length) return false; // chord can't match if wrong number of notes!
            let theseOffsets = thisObject.offsetsOnRoot(thisChord, rootNote);
            let reducedNoteArray = noteArray.map((x) => x % 12);  // copy of note array with notes reduced to 0-11
            // For each offset in the input, see if it matches one in the chord.
            let matches = noteArray.map((x) => -1);     // array of -1's same size as input notes
            for (let i = 0; i < reducedNoteArray.length; i++) {
                let j = theseOffsets.indexOf(reducedNoteArray[i]);
                if (j >= 0) matches[j] = i;
            }
            // Test if all notes had a match -- count the # of -1's.
            return (matches.reduce((accum, curr) => accum + (curr===-1?1:0),0) === 0);
        }
        thisObject.matchChord = function(noteArray) {
            // Matches the given notes with a chord (looking for an exact match).
            // Returns null if no match is found, or, if a chord is found, returns
            // an object: { rootNote, chordId, englishName, chordObject, [noteOrder]}.
            // The root note in the response is the actual key for the chord; then it
            // has the chord ID, full English name (e.g. "C Major"), and an array mapping
            // the notes in the chord to the notes in the input array (which helps with
            // mapping the auto-accompaniment).
            //
            // If you change this, change specificChordMatch; they are separate for performance reasons.

            // First, make a version of note array that has reduced notes...
            // and prepare some other stuff.
            let reducedNoteArray = noteArray.map((x) => x % 12);
            let matchesSource = noteArray.map((x) => -1);  // default match array, all -1's, for copying later
            // Now search all the chord possibilities...
            for (let k = 0; k < 12; k++) {
                // For each key / root note starting with C...
                for (let c = 0; c < thisObject.chords.length; c++) {
                    // For each potential chord...
                    let thisChord = thisObject.chords[c];
                    if (reducedNoteArray.length !== thisChord.offsets.length) continue;  // skip chords with wrong number of notes.
                    let theseOffsets = thisObject.offsetsOnRoot(thisChord, k);
                    // For each offset in the input, see if it matches one in the chord.
                    let matches = matchesSource.slice(0);  // array of -1's same size as the input chord
                    for (let i = 0; i < reducedNoteArray.length; i++) {
                        let j = theseOffsets.indexOf(reducedNoteArray[i]);
                        if (j >= 0) matches[j] = i;
                    }
                    // Test if all notes had a match -- count the # of -1's.
                    if (matches.reduce((accum, curr) => accum + (curr===-1?1:0),0) === 0) {
                        return { rootNote: k, chordId: thisChord.id, 
                            englishName: thisObject.noteNames[k] + " " + thisChord.name,
                            chordObject: thisChord, noteOrder: matches };   // successful find!
                    }
                }
            }
            //--- No matching chord
            return null;
        }
        thisObject.transposeOnChord = function(noteNumber, thisChord, rootNote, accompanimentNoteArray) {
            // Similar to transposeOnScale, this routine transposes a note to be played (noteNumber)
            // that is in a track with Auto-Accompany By Chord and the given chord object
            // (thisChord, which must be an object-- use getChord to get it), and root note (key).
            // It is transposed based on the accompaniment note keys pressed, in accompanimentNoteArray.
            // 
            // There are many situations in which the Chord method of autoaccompaniment should NOT
            // play a note, and in that case, -1 is returned.  For example, if the note number is not
            // in the chord, we don't know what to do unless the accompaniment notes are for the
            // original chord.  (Because we pass through all notes when the original chord is played,
            // you can have special trills and stuff in home position.)  Another source of -1 results
            // is if the down notes don't match a chord (but you should check that before putting them
            // in the auto accompaniment pipeline, using matchChord).  
            //
            // Upshot: just don't play the note if you get -1.

            let theseOffsets = thisObject.offsetsOnRoot(thisChord, rootNote);
            //-- Special case: user played the original chord this track was based on, so allow all original notes through (see above).
            if (thisObject.specificChordMatch(accompanimentNoteArray,thisChord,rootNote))
                return noteNumber;
            //-- Normal case: First, find out what chord the user played.  And sort the note array first,
            //-- it helps with inversions.
            let accompanimentNoteArraySorted = accompanimentNoteArray.slice(0).sort();
            let matchingChord = thisObject.matchChord(accompanimentNoteArraySorted);
            if (matchingChord===null) return -1;  // no matching chord? no play.  (So don't send accompaniment keys if they don't form a chord.)
            //-- Now: what offset is noteNumber in its original Chord?
            for (let i = 0; i < theseOffsets.length; i++) {
                if (noteNumber % 12 === theseOffsets[i]) {
                    // This one!  Now, the irony is we don't need the note order array because
                    // we want to change our accompaniment order when the player does chord inversions.
                    // And that means that since we sorted our input array, which is an array of notes
                    // in the chord, we just pick the note that is #i in the sorted array!
                    // Caveat: there might be fewer accompaniment notes than original notes
                    // (e.g. original AA sequence is based on a 7th chord but user played a tonic).
                    // In that case we return -1: no play.  The 7th note will only play during times
                    // when the AA chord is also a 7th (or any chord with 4 notes).
                    if (i < 0 || i >= accompanimentNoteArraySorted.length) return -1;
                    return accompanimentNoteArraySorted[i];
                }
            }
            //-- note number not found in its original chord, so don't play!
            return -1;
        }
    }
}

export let MTheory = new MTheoryClass();
