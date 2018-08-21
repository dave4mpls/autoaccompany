//
//  Hidden Settings Area: automatically shows
//  or hides based on an expression relating to another setting property.
//
import React from 'react';
import { SettingsStorage } from './Settings.js';
import { SettingComponent } from './SettingComponent.js';
import { SettingsCaptionCell, SettingsValueCell } from './SettingsPanel.js';

//
//  Required props:
//  settingName: the setting this panel is dependent on.
//
//  Optional: 
//  settingsStorageObject: if you set this, a different Settings Storage object will
//      be used instead of the global one; this is used to take advantage of the Settings
//      user interface components to control settings of songs, for example.
//  showFunction: a function that returns true if the panel should be visible,
//      whose first parameter will be the current value of settingName.  If not
//      provided, the hidden area is shown whenever the given setting is true.
//  showType.  If this is left out, "block" is assumed, otherwise, showType is
//      the text placed in the "display" style of the enclosing div.
//  rowLabel.  If existent, this is rendered as a table row with two cells, with the row
//      label being in the first cell, similar to SettingsRow.
//  style.  If exists, styles the component.
//
export class HiddenSettingsArea extends SettingComponent {
    static defaultProps = { 
        showFunction: ((t) => t),
        showType: "",
        style: { }
    }; 

    constructor(props) {
        // We still extend SettingComponent to listen to SettingName (the property we are
        // dependent on), but instead of setting the property, we just determine our visibility.
        // Because settings need to be in the DOM in order to listen for changes from other components,
        // we always hide the settings rather than not rendering them at all.
        super(props);
        this.state = { 
            settingProperty: this.props.settingName,
            settingValue: this.settingComponentGet(this.props.settingName) };
    }

    render() {
        let shouldShow = 
            this.props.showFunction(this.state.settingValue);
        let displayStyle = JSON.parse(JSON.stringify(this.props.style));
        let calculatedDisplayStyle = (shouldShow ? this.props.showType : "none");
        displayStyle.display = calculatedDisplayStyle;
        if (this.props.hasOwnProperty("rowLabel")) {
            return (
                <tr style={displayStyle}>
                    <SettingsCaptionCell name={this.props.rowLabel} />
                    <SettingsValueCell>{this.props.children}</SettingsValueCell>
                </tr>
            );
        }
        else {
            return (
                <div style={displayStyle}>
                { this.props.children }
                </div>
            );
        }
    }
}
