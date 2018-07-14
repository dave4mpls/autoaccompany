//
//  Settings drop down for selecting an instrument for a MIDI channel on the AAPlayer
//
import React, { Component } from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

// uses popups
import Popup from "reactjs-popup";

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class InstrumentSelector extends Component {
    static defaultProps = { channel: 0 };

    constructor(props) {
        super(props);
        this.state = { open: false, currentInstrument: 
            SettingsStorage.getSettingArray("currentInstrument",this.props.channel) }
    }

    handleChange(evt) {
        let newInstrument = parseInt("" + evt.target.value, 10);
        this.setState({ currentInstrument: newInstrument });
        let thisObject = this;
        this.openPopup();
        AAPlayer.loadPlugin({setupMIDI: false, instrument: newInstrument, 
            initialSetup: false, onsuccess: function()
            {
            SettingsStorage.putSettingArray("currentInstrument",thisObject.props.channel,newInstrument);
            AAPlayer.sendInputProgramChange(thisObject.props.channel, newInstrument);
            thisObject.closePopup();
            }});
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
                value={this.state.currentInstrument}
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
