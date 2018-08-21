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
//  You should always use the settingComponentPut and settingComponentGet (and settingComponentPutArray
//  and settingComponentGetArray) methods to change your settings; this module also handles having
//  an optional settingsComponentObject prop, which allows the settings UI to be redirected to
//  other objects derived from the GenericSettingsStorage class.  For example, an intermediary class
//  that directs settings changes to a particular song during song settings changes.
//


import { Component } from 'react';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

export class SettingComponent extends Component {
    constructor(props) {
        super(props);
        if (props.settingsStorageObject != null)
            this.settingsStorageObject = props.settingsStorageObject;
        else
            this.settingsStorageObject = SettingsStorage;
        this.handleSettingChangeEvent = this.handleSettingChangeEvent.bind(this);
    }
    handleSettingChangeEvent() {
        if (this.state.hasOwnProperty("settingIndex"))
            {
            let newValue = this.settingsStorageObject.getSettingArray(this.state.settingProperty, this.state.settingIndex);
            this.setState({settingValue: newValue });
            if (this.handleNewValue) this.handleNewValue(newValue)
            }
        else
            {
            let newValue = this.settingsStorageObject.getSetting(this.state.settingProperty);
            this.setState({settingValue: newValue});
            if (this.handleNewValue) this.handleNewValue(newValue);
            }
    }
    settingComponentGetGlobalProperty(p) {
        //--- for special global settings like Midi Missing Message, you use this to
        //--- always reference the global object.  There is no corresponding PUT because
        //--- this is generally for global constants.
        return SettingsStorage[p];      // we use [] instead of getSetting because the global constants are direct properties.
    }
    settingComponentPut(p,v) {
        this.settingsStorageObject.putSetting(p,v);
    }
    settingComponentGet(p) {
        return this.settingsStorageObject.getSetting(p);
    }
    settingComponentPutArray(p,i,v) {
        this.settingsStorageObject.putSettingArray(p,i,v);
    }
    settingComponentGetArray(p,i) {
        return this.settingsStorageObject.getSettingArray(p,i);
    }
    componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        this.settingsStorageObject.attachSettingChangeHandler(this.state.settingProperty, this.handleSettingChangeEvent);
    }
    componentWillUnmount() {
        if (super.componentWillUnmount) super.componentWillUnmount();
        this.settingsStorageObject.removeSettingChangeHandler(this.state.settingProperty, this.handleSettingChangeEvent);
    }
}
