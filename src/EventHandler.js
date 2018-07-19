//
//  Generic event attachment system for objects that need to have listeners or events.
//  Dave White
//  7/18/2018       MIT License
//

export class EventHandler {
    constructor() {
        let thisObject = this;
        this.notifications = { };
        this.inNotification = [ ];  // tracks notifications we are currently inside of so we don't recurse them

        // Internal routines.
        this.makeKey = function(eventName, propertyName) {
            return eventName + "::" + propertyName;
        }

        this.createListIfNeeded = function(key) {
            if (!thisObject.notifications.hasOwnProperty(key)) {
                thisObject.notifications[key] = [ ];
            }
        }

        // Notification routines.
        this.addEventHandler = function(eventName, propertyName, callbackFunction) {
            // This is the main routine for adding events to the event handler.
            // It takes an event name and property name, which can be defined by the caller, as a hash
            // to locate the events.   It then adds the callback function to a list of such functions
            // for that event-property combination, but only if that particular callback function has
            // not been added before (otherwise the call is ignored).
            let key = thisObject.makeKey(eventName, propertyName);
            thisObject.createListIfNeeded(key);
            let currentEventArray = thisObject.notifications[key];
            if (currentEventArray.indexOf(callbackFunction) !== -1) return; // already there
            currentEventArray.push(callbackFunction);
            return callbackFunction;
        }

        this.removeEventHandler = function(eventName, propertyName, callbackFunction) {
            // Removes an event handler that had been previously registered.  Ignores the call if
            // the event handler was not attached.
            let key = thisObject.makeKey(eventName, propertyName);
            thisObject.createListIfNeeded(key);
            let currentEventArray = thisObject.notifications[key];
            let i = currentEventArray.indexOf(callbackFunction);
            if (i===-1) return;
            currentEventArray.splice(i,1);
        }

        this.callHandlers = function(eventName, propertyName, param) {
            // Calls the handlers in this object, passing them the given parameter.
            // Ignores exceptions in the event routines.
            // And don't call a particular handler if we're actually inside that same handler.
            let key = thisObject.makeKey(eventName, propertyName);
            thisObject.createListIfNeeded(key);
            let currentEventArray = thisObject.notifications[key];
            for (let i = 0; i < currentEventArray.length; i++) { 
                if (thisObject.inNotification.indexOf(currentEventArray[i]) === -1) {
                    thisObject.inNotification.push(currentEventArray[i]);
                    try { currentEventArray[i](param); } catch(e) { }
                    thisObject.inNotification.pop();
                }
            }
        }
    }
}