//
//  Settings storage for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

//  Handles persistence, event notifications for any app's settings.
//

import { EventHandler } from '../EventHandler.js';

export class GenericSettingsStorageClass {
    //  This object is implemented with the internal storage names prepended with _.
    //  Use getSetting and putSetting (and getSettingArray and putSettingArray) to
    //  access the settings elsewhere-- otherwise they will not be saved.  When
    //  you use the correct access mechanism, the settings are auto-saved to local storage.
    // 
    constructor() {
        // internal settings object settings
        this._loaded = false;  // ONLY persist if we have been loaded!
        this.events = new EventHandler();
        let thisObject = this;

        // Notification routines.
        
        let externalName = function(n) {
            // private function, hence, not assigned to "this"
            n += "";
            if (n.substr(0,1) !== "_") return n;
            return n.substr(1);
        }

        this.attachSettingChangeHandler = function(propertyName, eventHandler) {
            return thisObject.events.addEventHandler("onSettingChange", propertyName, eventHandler);
        }

        this.removeSettingChangeHandler = function(propertyName, eventHandler) {
            thisObject.events.removeEventHandler("onSettingChange", propertyName, eventHandler);
        }

        this.notify = function(propertyName) {
            thisObject.events.callHandlers("onSettingChange", propertyName, null);
            thisObject.events.callHandlers("onSettingChange", "*", null);
        }

        // Persistence routines.
        this.persist = function() {
            //-- Called internally by putSetting and putSettingArray to auto-save new settings.
            if (thisObject.hasOwnProperty("_noPersistence") && thisObject._noPersistence) return;   // allow non-global objects to set the noPersistence property to ensure that they don't get saved
            if (!thisObject._loaded) return;  // we have to be loaded before we persist
            localStorage.setItem("appSettings", JSON.stringify(thisObject));
        }

        this.load = function () {
            //-- Called publicly to load the settings on startup.
            //   Does NOT send midi messages or set up instruments -- caller has to do that.
            if (thisObject.hasOwnProperty("_noPersistence") && thisObject._noPersistence) return;   // allow non-global objects to set the noPersistence property to ensure that they don't get saved
            if (!localStorage.getItem("appSettings")) {
                thisObject._loaded = true;  // if not saved yet, just set loaded flag and return
                return; 
            }
            //-- we can't just assign the whole object since that will remove all the methods.
            //   we put the settings in a separate method and copy over the properties.
            try {
                let p = JSON.parse(localStorage.getItem("appSettings"));
                for (let thisItem in p) {
                    if (thisItem === "events") continue;
                        // ^ don't mess with event handlers, they are regenerated anew each time
                    try {
                        thisObject[thisItem] = p[thisItem];
                        thisObject.notify(externalName(thisItem));
                    } catch(e) { }
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
            thisObject.notify(n);
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
            thisObject.notify(n);
            return v;
        }

        this.getSettingArray = function(n, idx) {
            // Gets a setting array element.
            return thisObject[internalName(n)][idx];
        }
    }
}
