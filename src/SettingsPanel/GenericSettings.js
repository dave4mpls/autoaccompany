//
//  Settings components for generic settings such as numeric, text, select list box
//
import React from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';
import { SettingComponent } from '../SettingsPanel/SettingComponent.js';

// Specialized input boxes
import NumericInput from 'react-numeric-input';     //license: MIT
import Switch from 'react-switch';   // license: MIT
import Knob from './Knob.js';   // license: MIT

//
//  Numeric Setting Box with Up/Down Arrows (based on react-numeric-input)
//
export class NumericSetting extends SettingComponent {

    constructor(props) {
        super(props);
        this.state = { 
            settingProperty: this.props.settingName, 
            settingValue: this.settingComponentGet(this.props.settingName) };
    }

    handleChange(valueAsNumber, valueAsString, inputDOM) {  
        // handles change in the setting
        this.settingComponentPut(this.props.settingName, valueAsNumber);
    }

    render() {
        return (
            <NumericInput
                min={this.props.min}
                max={this.props.max}
                step={this.props.step}
                precision={this.props.precision}
                format={this.props.format}
                value={this.state.settingValue}
                className="settings-numeric-setting"
                onChange={ (valueAsNumber, valueAsString, inputDOM) => 
                    this.handleChange(valueAsNumber, valueAsString, inputDOM) }
            />
        );
    }
}

//
//  Toggle Setting Switch with Up/Down Arrows (based on react-toggle-switch)
//
export class ToggleSetting extends SettingComponent {

    constructor(props) {
        super(props);
        this.state = { 
            settingProperty: this.props.settingName,
            settingValue: this.settingComponentGet(this.props.settingName) };
    }

    handleChange(checked) {  
        // handles change in the setting
        this.settingComponentPut(this.props.settingName, checked);
    }

    render() {
        return (
            <Switch
                onChange={(checked) => this.handleChange(checked) }
                checked={this.state.settingValue}
                onColor='#1890ff'
                height={16}
                width={40}
            />
        );
    }
}

//
//  Knob Setting 
//
export class KnobSetting extends SettingComponent {

    constructor(props) {
        super(props);
        this.state = { 
            settingProperty: this.props.settingName, 
            settingValue: this.settingComponentGet(this.props.settingName) };
    }

    handleChange(valueAsNumber) {  
        // handles change in the setting
        this.settingComponentPut(this.props.settingName, valueAsNumber);
    }

    render() {
        return (
            <Knob
                width={60}
                height={60}
                lineCap="butt"
                disableTextInput={true}
                displayInput={true}
                min={this.props.min}
                max={this.props.max}
                step={this.props.step}
                value={this.state.settingValue}
                fgColor="#1890ff"
                onChange={ (valueAsNumber) => 
                    this.handleChange(valueAsNumber) }
                onChangeEnd={ (valueAsNumber) => { } }
            />
        );
    }
}

