//
//  Settings drop down for setting an individual MIDI key settings parameter by playing 
//  that key.  It shows the key in musical form (e.g. C#4), as a button.  You press the button,
//  and it pops up a popup window to 
//
import React from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { SettingComponent } from '../SettingsPanel/SettingComponent.js';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard.js';

// uses popups
import Popup from "reactjs-popup";
import '../PopupStyles.css';

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class MIDIKeySelector extends SettingComponent {

    constructor(props) {
        super(props);
        this.state = { open: false, 
            settingProperty: this.props.settingName,
            settingValue: this.settingComponentGet(this.props.settingName) };
        this.playerHandler = null;
        this.playerHandlerEnd = null;
    }

    handleClick() {  
        // User clicked the note display: pop up the popup.
        // Set up the listener that listens for the MIDI/screen-key note too.
        this.openPopup();
        let thisObject = this;
        thisObject.playerHandler = AAPlayer.attachEventHandler("onInputNoteOn", function(noteObj) {
            if (thisObject.props.playNote) {
                //-- there is a prop that makes this play the actual note.
                AAPlayer.noteOn(0, noteObj.noteNumber, 127, 0);
                AAPlayer.noteOff(0, noteObj.noteNumber, 0.25);
            }
            AAPlayer.preventDefault();
            thisObject.settingComponentPut(thisObject.props.settingName, noteObj.noteNumber);
        });
        thisObject.playerHandlerEnd = AAPlayer.attachEventHandler("onInputNoteOff", function(noteObj) {
            // we don't close the popup until the user lets GO of the note, especially for when
            // it is a screen keyboard note, because in that case closing the popup when their
            // finger is down will lead to the keyboards underneath being played.
            AAPlayer.preventDefault();
            thisObject.closePopup();
        })
    }

    handleCloseNoChange() {
        // user wants to close the popup without changing anything
        this.closePopup();
    }

    handleUnassigned() {
        // user wants to not have this feature be assigned to a MIDI key
        this.settingComponentPut(this.props.settingName, 0);
        this.closePopup();
    }

    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.setState( {open: false} );
        //-- WHENEVER the poppup is closed we MUST turn off the midi listener!
        if (this.playerHandler) {
            AAPlayer.removeEventHandler("onInputNoteOn", this.playerHandler);
            this.playerHandler = null;
        }
        if (this.playerHandlerEnd) {
            AAPlayer.removeEventHandler("onInputNoteOff", this.playerHandlerEnd);
            this.playerHandlerEnd = null;
        }
    }

    render() {
        if (!AAPlayer.supportsMIDI()) {
            return (<div>{ this.settingComponentGetGlobalProperty("midiMissingMessage") }</div>);
        }
        return (
            <span>
            <button className="midi-key-button" onClick={() => this.handleClick() }>
            { AAPlayer.noteToKey(this.state.settingValue) }
            </button>
            <Popup 
                    open={this.state.open} 
                    closeOnDocumentClick={true} 
                    contentStyle={{ width: "90%" }}
                    onClose={()=>this.closePopup()} >
                <div className="modal">
                <a className="popup-close-button" onClick={()=>this.closePopup()}>
                  &times;
                </a>
                <h4>Select which piano keyboard key is the: { this.props.settingLongName}</h4>
                <div className="settings-key-description">{ this.props.settingDescription }</div>
                <div className="settings-press-key">Press the MIDI/piano key you want now.
                </div><br />
                <br />
                <div className="settings-key-description">
                If pressing piano keys doesn't work, close this window then make sure your
                MIDI device is selected as an Input.
                </div><br />
                <button className="settings-popup-button" onClick={()=>this.handleUnassigned()}>
                Don't assign a key for this
                </button><br /><br />
                <button className="settings-popup-button" onClick={()=>this.handleCloseNoChange()}>
                Close without changing the key
                </button><br /><br />
                <PianoKeyboard 
                    player={ AAPlayer }
                    channel={0}
                    minNote={36} 
                    maxNote={89} 
                    percentScreenHeight={15} 
                    id={5} />
                </div>
            </Popup>
            </span>
        );
    }
}
