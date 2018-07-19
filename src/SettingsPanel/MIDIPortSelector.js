//
//  Settings drop down for selecting an input or output port on hardware MIDI
//
import React from 'react';
import update from 'immutability-helper';   // license: MIT
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { SettingComponent } from '../SettingsPanel/SettingComponent.js';

// uses multiple select checkboxes
import Select from '../react-multiple-checkbox-select/lib/Select.js';    // License: MIT

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class MIDIPortSelector extends SettingComponent {
    static defaultProps = { portType: "output" };

    constructor(props) {
        super(props);
        this.state = { open: false, 
            refreshCount: 0,  // we increment this to force a change in state and
                              // redraw the choices when user presses refresh.  This
                              // reloads the MIDI inputs/outputs from WebMIDI.
            settingProperty: (this.props.portType === "input" ? "currentInput" : "currentOutput"),
            settingValue: (this.props.portType === "input" ? SettingsStorage.getSetting("currentInput")
                : SettingsStorage.getSetting("currentOutput")) };
    }

    handleNewValue(newPorts) {
        // called by SettingComponent whenever SettingsStorage properties change, whether
        // through this UI or elsewhere
        if (this.props.portType === "input") 
            AAPlayer.setInput(newPorts);
        else {
            AAPlayer.setOutput(newPorts);
            // make sure all outputs get current main keyboard instrument & accompany instrument
            AAPlayer.programChange(0, SettingsStorage.getSettingArray("currentInstrument",0));
            AAPlayer.programChange(1, SettingsStorage.getSettingArray("currentInstrument",1));
        }
    }

    handleChange(values) {
        var newPorts = [ ];
        for (var i = 0; i < values.length; i++) newPorts.push(values[i].value);
        if (this.props.portType === "input") {
            SettingsStorage.putSetting("currentInput",newPorts);
        }
        else {
            SettingsStorage.putSetting("currentOutput",newPorts);
        }
    }

    handleRefreshButtonClick(evt) {
        this.setState(function(prevState) {
            prevState.refreshCount++;
            return update(prevState, {"refreshCount": {$set: prevState.refreshCount+1} });
        });
    }

    render() {
        if (!AAPlayer.supportsMIDI()) {
            return (<div>{ SettingsStorage.midiMissingMessage }</div>);
        }
        let sourceList = 
            (this.props.portType==="input") ? AAPlayer.refreshInputs() : AAPlayer.refreshOutputs();
        let choiceList = [ ];
        let valueList = [ ];
        for (var i = 0; i < sourceList.length; i++) {
            choiceList.push({ value: sourceList[i].id, label: sourceList[i].name });
            if ((SettingsStorage.getSetting(this.state.settingProperty)).indexOf(sourceList[i].id) !== -1)
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
            </span>
        );
    }
}
