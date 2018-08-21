//
//  Settings drop down for selecting an instrument for a MIDI channel on the AAPlayer
//
import React from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { SettingComponent } from '../SettingsPanel/SettingComponent.js';

// uses popups
import Popup from "reactjs-popup";

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class InstrumentSelector extends SettingComponent {
    static defaultProps = { channel: 0 };

    constructor(props) {
        super(props);
        this.state = { open: false, 
            settingProperty: "currentInstrument",
            settingIndex: this.props.channel,
            settingValue: 
                this.settingComponentGetArray("currentInstrument",this.props.channel) }
    }

    handleNewValue(newInstrument) {
        //-- called by SettingComponent whenever the settingsStorageObject element it is listening to changes--
        //-- and actually does all the tasks relating to changing an instrument, including
        //-- loading the instrument and sending appropriate MIDI signals.
        let thisObject = this;
        this.openPopup();
        AAPlayer.loadPlugin({setupMIDI: false, instrument: newInstrument, 
            initialSetup: false, onsuccess: function()
            {
            AAPlayer.sendInputProgramChange(thisObject.props.channel, newInstrument);
            thisObject.closePopup();
            }});
    }

    handleChange(evt) {
        let newInstrument = parseInt("" + evt.target.value, 10);
        this.settingComponentPutArray("currentInstrument", this.props.channel, newInstrument);
    }

    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.setState( {open: false} );
    }

    render() {
        return (
            <span>
            <select 
                className="settings-input"
                onChange={(evt)=>this.handleChange(evt)} 
                value={this.state.settingValue}
                >
            {
                function() {
                    let byId = AAPlayer.byId();
                    let options = [ ];
                    for (let i = 0; i < 128; i++) {
                        options.push(<option key={i} value={byId[i].number}>{byId[i].instrument}</option>)
                    }
                    return options;
                }()
            }
            </select>
            <Popup 
                    open={this.state.open} 
                    closeOnDocumentClick={false} 
                    onClose={()=>this.closePopup()} >
                <div className="modal">
                Please wait, your instrument is loading...
                </div>
            </Popup>
            </span>
        );
    }
}
