//
//  Settings drop down for selecting an input or output port on hardware MIDI
//
import React, { Component } from 'react';
import update from 'immutability-helper';   // license: MIT
import { SettingsStorage } from '../SettingsPanel/Settings.js';

// uses popups
import Popup from "reactjs-popup";

// uses multiple select checkboxes
import Select from '../react-multiple-checkbox-select/lib/Select.js';    // License: MIT

// MIDI related imports
import AAPlayer from '../MIDI/AAPlayer.js';

export class MIDIPortSelector extends Component {
    static defaultProps = { portType: "output" };

    constructor(props) {
        super(props);
        this.state = { open: false, 
            refreshCount: 0,  // we increment this to force a change in state and
                              // redraw the choices when user presses refresh.  This
                              // reloads the MIDI inputs/outputs from WebMIDI.
            currentOutput: SettingsStorage.currentOutput,
            currentInput: SettingsStorage.currentInput };
    }

    handleChange(values) {
        var newPorts = [ ];
        for (var i = 0; i < values.length; i++) newPorts.push(values[i].value);
        if (this.props.portType == "input") {
            AAPlayer.setInput(newPorts);
            SettingsStorage.currentInput = newPorts;
        }
        else {
            AAPlayer.setOutput(newPorts);
            SettingsStorage.currentOutput = newPorts;
            // make sure all outputs get current main keyboard instrument
            AAPlayer.programChange(0, SettingsStorage.currentInstrument[0]);
        }
    }

    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.setState( {open: false} );
    }

    handleRefreshButtonClick(evt) {
        this.setState(function(prevState) {
            prevState.refreshCount++;
            return update(prevState, {"refreshCount": {$set: prevState.refreshCount+1} });
        });
    }

    render() {
        if (!AAPlayer.supportsMIDI()) {
            return (<div>Your browser does not support MIDI hardware.  Try using Chrome!</div>);
        }
        let sourceList = 
            (this.props.portType==="input") ? AAPlayer.refreshInputs() : AAPlayer.refreshOutputs();
        let choiceList = [ ];
        let valueList = [ ];
        for (var i = 0; i < sourceList.length; i++) {
            choiceList.push({ value: sourceList[i].id, label: sourceList[i].name });
            if (SettingsStorage.currentInput.indexOf(sourceList[i].id) !== -1)
                valueList.push(sourceList[i].id);
        }
        return (
            <span>
            <Select
            data= { choiceList } 
            value= { valueList }
            onSubmit= { (values) => this.handleChange(values) }
            />
            <button onClick={(evt) => this.handleRefreshButtonClick(evt) }>
            { "↻ Check for new " + this.props.portType + "s" }
            </button>
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
