//
//  Settings storage for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

//  Settings are stored in this one object so that it can be eventually
//  persisted to local storage or somewhere, in a future version.

import { GenericSettingsStorageClass } from './GenericSettingsStorage.js';

class SettingsStorageClass extends GenericSettingsStorageClass {
    //
    //  Generic Settings Storage handles all the standard settings stuff.
    //  We just load it up with specific settings defaults.
    constructor() {
        super();

        // midi hardware settings
        this._currentInstrument = [0,0,0,0,0,0,0,0,0,128,0,0,0,0,0,0];
        this._currentInput = ["internal"];
        this._currentOutput = ["internal"];

        // screen keyboard settings
        this._screenAccompanimentKeyboard = false;
        this._recordPanelByKeyboard = false;
        this._pitchControlHorizontal = false;  // cool onscreen keyboard pitch bend option!

        // midi velocity settings
        this._minVelocity = 0;
        this._maxVelocity = 127;
    
        // frequently used strings that might, however, change-- put them here
        // for example this next one currently says try using chrome, well, I reserve judgement :-P
        this.midiMissingMessage = "Your browser does not support MIDI hardware.  Try using Chrome!";
    
    
        // MIDI passthrough / playing features
        this._playNotesFromMIDI = true;        // if false, it only plays notes that are pressed internally
                                                // (e.g. if your MIDI keyboard makes its own sound).
    
        // MIDI keyboard special keys -- key numbers so you can use MIDI keys for common functions
        // while playing.
        this._recordKey = 0;
        this._recordNextKey = 0;
        this._stopKey = 0;
        this._playKey = 0;
        this._rewindKey = 0;
    
    }
}

export let SettingsStorage = new SettingsStorageClass();
