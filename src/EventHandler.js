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
        this.preventDefaultFlag = false;

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
            thisObject.preventDefaultFlag = false;
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

        this.preventDefault = function () {
            thisObject.preventDefaultFlag = true;
        }

        this.addEventMethods = function(o, oevent, prefix = "", includeProperties = false) {
            // Adds event-handler methods to the object o, relating to its event object
            // (this class) oevent, and with the given prefix, so that the object can have
            // a consistent API for callers to use to attach events, or for itself to
            // fire events.  Set includeProperties to true for the full, properties-based version,
            // or to false for the version with only event names, which is more common.
            if (includeProperties) {
                // PROPERTIES VERSION
                o[prefix + "attachEventHandler"] = function(eventName, propertyName, eventHandler) {
                    return oevent.addEventHandler(eventName, propertyName, eventHandler);
                }
                o[prefix + "removeEventHandler"] = function(eventName, propertyName, eventHandler) {
                    oevent.removeEventHandler(eventName, propertyName, eventHandler);
                }
                o[prefix + "preventDefault"] = function() {
                    oevent.preventDefault();
                }
                o[prefix + "fireEvent"] = function(eventName, propertyName, parm) {
                    oevent.callHandlers(eventName, propertyName, parm);
                    let r = oevent.preventDefaultFlag;
                    oevent.preventDefaultFlag = false;
                    return r;
                }
            }
            else {
                // NON-PROPERTIES VERSION
                o[prefix + "attachEventHandler"] = function(eventName, eventHandler) {
                    return oevent.addEventHandler(eventName, "*", eventHandler);
                }
                o[prefix + "removeEventHandler"] = function(eventName, eventHandler) {
                    oevent.removeEventHandler(eventName, "*", eventHandler);
                }
                o[prefix + "preventDefault"] = function() {
                    oevent.preventDefault();
                }
                o[prefix + "fireEvent"] = function(eventName, parm) {
                    oevent.callHandlers(eventName, "*", parm);
                    let r = oevent.preventDefaultFlag;
                    oevent.preventDefaultFlag = false;
                    return r;
                }
            }
        }
    }
}