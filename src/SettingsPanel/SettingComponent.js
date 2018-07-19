//
//  Generic Setting UI component that sets settings and responds to setting changes
//  either from other components or from the UI.  All Settings components should
//  extend it.
//
//  Assumption: when you use this you must set a settingValue in the state, and a
//  settingProperty, so that it can interact properly with the SettingStorage object's
//  event handler.
//
//  Optionally, if your setting control relates to a particular index of a setting array,
//  set the settingIndex in the constructor as well, and this routine will focus on just that index.
//
//  Your setting component may also have a handleNewValue() function, which gets called with the new
//  value whenever the value changes.  This function doesn't have to change the state of settingValue,
//  which is done by the SettingComponent class itself.
//


import { Component } from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

export class SettingComponent extends Component {
    constructor(props) {
        super(props);
        this.handleSettingChangeEvent = this.handleSettingChangeEvent.bind(this);
    }
    handleSettingChangeEvent() {
        if (this.state.hasOwnProperty("settingIndex"))
            {
            let newValue = SettingsStorage.getSettingArray(this.state.settingProperty, this.state.settingIndex);
            this.setState({settingValue: newValue });
            if (this.handleNewValue) this.handleNewValue(newValue)
            }
        else
            {
            let newValue = SettingsStorage.getSetting(this.state.settingProperty);
            this.setState({settingValue: newValue});
            if (this.handleNewValue) this.handleNewValue(newValue);
            }
    }
    componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        SettingsStorage.attachSettingChangeHandler(this.state.settingProperty, this.handleSettingChangeEvent);
    }
    componentWillUnmount() {
        if (super.componentWillUnmount) super.componentWillUnmount();
        SettingsStorage.removeSettingChangeHandler(this.state.settingProperty, this.handleSettingChangeEvent);
    }
}
