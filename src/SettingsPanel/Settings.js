//
//  Settings storage for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

//  Settings are stored in this one object so that it can be eventually
//  persisted to local storage or somewhere, in a future version.

class SettingsStorageClass {
    //  This object is implemented with the internal storage names prepended with _.
    //  Use getSetting and putSetting (and getSettingArray and putSettingArray) to
    //  access the settings elsewhere-- otherwise they will not be saved.  When
    //  you use the correct access mechanism, the settings are auto-saved to local storage.
    // 
    constructor() {
        // internal settings object settings
        this._loaded = false;  // ONLY persist if we have been loaded!

        // midi hardware settings
        this._currentInstrument = [0,0,0,0,0,0,0,0,0,128,0,0,0,0,0,0];
        this._currentInput = ["internal"];
        this._currentOutput = ["internal"];

        // midi velocity settings
        this._minVelocity = 0;
        this._maxVelocity = 127;
    
        // frequently used strings that might, however, change-- put them here
        // for example this next one currently says try using chrome, well, I reserve judgement :-P
        this.midiMissingMessage = "Your browser does not support MIDI hardware.  Try using Chrome!";
    
        // onscreen keyboard options
        this._pitchControlHorizontal = false;  // cool onscreen keyboard pitch bend option!
    
        // MIDI passthrough / playing features
        this._playNotesFromMIDI = true;        // if false, it only plays notes that are pressed internally
                                                // (e.g. if your MIDI keyboard makes its own sound).
    
        // MIDI keyboard special keys -- key numbers
        this._recordKey = 0;
        this._finishStartKey = 0;
        this._stopKey = 0;
        this._playKey = 0;
        this._rewindKey = 0;
    
        let thisObject = this;

        // Persistence routines.
        this.persist = function() {
            //-- Called internally by putSetting and putSettingArray to auto-save new settings.
            if (!thisObject._loaded) return;  // we have to be loaded before we persist
            localStorage.setItem("mpSettings", JSON.stringify(thisObject));
        }

        this.load = function () {
            //-- Called publicly to load the settings on startup.
            //   Does NOT send midi messages or set up instruments -- caller has to do that.
            if (!localStorage.getItem("mpSettings")) {
                thisObject._loaded = true;  // if not saved yet, just set loaded flag and return
                return; 
            }
            //-- we can't just assign the whole object since that will remove all the methods.
            //   we put the settings in a separate method and copy over the properties.
            try {
                let p = JSON.parse(localStorage.getItem("mpSettings"));
                for (let thisItem in p) {
                    thisObject[thisItem] = p[thisItem];
                }

                thisObject._loaded = true;
            } catch(e) { }
        }

        // Access routines.
        let internalName = function(n) {
            // private function, hence, not assigned to "this"
            return "_" + n;
        }

        this.putSetting = function(n, v) {
            // Puts a setting value for the given name.
            thisObject[internalName(n)] = v;
            thisObject.persist();
            return v;
        }

        this.getSetting = function(n) {
            // Gets a setting.
            return thisObject[internalName(n)];
        }

        this.putSettingArray = function(n, idx, v) {
            // Puts a setting value in an array for the given name.
            thisObject[internalName(n)][idx] = v;
            thisObject.persist();
            return v;
        }

        this.getSettingArray = function(n, idx) {
            // Gets a setting array element.
            return thisObject[internalName(n)][idx];
        }
    }
}

export let SettingsStorage = new SettingsStorageClass();
