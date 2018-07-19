//
//  Settings drop down for setting an individual MIDI key settings parameter by playing 
//  that key.  It shows the key in musical form (e.g. C#4), as a button.  You press the button,
//  and it pops up a popup window to 
//
import React from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { SettingComponent } from '../SettingsPanel/SettingComponent.js';

// uses popups
import Popup from "reactjs-popup";

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class MIDIKeySelector extends SettingComponent {

    constructor(props) {
        super(props);
        this.state = { open: false, 
            settingProperty: this.props.settingName,
            settingValue: SettingsStorage.getSetting(this.props.settingName) };
    }

    handleClick() {  
        // User clicked the note display: pop up the popup.
        // Set up the listener that listens for the MIDI note too.
        this.openPopup();
        let thisObject = this;
        AAPlayer.onmidideviceinput = function(message) {
            //-- received midi message: is it NoteOn?
            if ((message.data[0] & 0xF0) === 0x90) {
                //-- it was note on: get the note, put it in settings and display state,
                //-- and close the dialog, which also turns off the midi listener.
                if (thisObject.props.playNote) {
                    //-- there is a prop that makes this play the actual note.
                    AAPlayer.noteOn(0, message.data[1], 127, 0);
                    AAPlayer.noteOff(0, message.data[1], 0.25);
                }
                SettingsStorage.putSetting(thisObject.props.settingName, message.data[1]);
                thisObject.closePopup();
            }
            else    // not note on... ignore
                return false;
        }
    }

    handleCloseNoChange() {
        // user wants to close the popup without changing anything
        this.closePopup();
    }

    handleUnassigned() {
        // user wants to not have this feature be assigned to a MIDI key
        SettingsStorage.putSetting(this.props.settingName, 0);
        this.closePopup();
    }

    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.setState( {open: false} );
        //-- WHENEVER the poppup is closed we MUST turn off the midi listener!
        AAPlayer.onmidideviceinput = null;
    }

    render() {
        if (!AAPlayer.supportsMIDI()) {
            return (<div>{ SettingsStorage.midiMissingMessage }</div>);
        }
        return (
            <span>
            <button className="midi-key-button" onClick={() => this.handleClick() }>
            { AAPlayer.noteToKey(this.state.settingValue) }
            </button>
            <Popup 
                    open={this.state.open} 
                    closeOnDocumentClick={true} 
                    onClose={()=>this.closePopup()} >
                <div className="modal">
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
                </button><br />
                <button className="settings-popup-button" onClick={()=>this.handleCloseNoChange()}>
                Close without changing the key
                </button>
                </div>
            </Popup>
            </span>
        );
    }
}
