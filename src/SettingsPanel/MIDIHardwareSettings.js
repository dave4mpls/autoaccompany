//
//  MIDI Hardware Settings List for Musical Playground
//  Dave White, 7/19/18, MIT License
//
import React, { Component } from 'react';

import { SettingsPanel, SettingsRow } from './SettingsPanel.js';

import { MIDIPortSelector } from './MIDIPortSelector.js';
import { NumericSetting, KnobSetting, ToggleSetting } from './GenericSettings.js';

export class MIDIHardwareSettings extends Component {
    render() {
        return (
            <SettingsPanel fillAvailableSpace={true} >
                <SettingsRow name="Output">
                    <MIDIPortSelector portType="output" />
                </SettingsRow>
                <SettingsRow name="Input">
                    <MIDIPortSelector portType="input" />
                </SettingsRow>
                <SettingsRow name="Play Notes from MIDI">
                    <ToggleSetting settingName="playNotesFromMIDI" />
                </SettingsRow>
                <SettingsRow name="Accompaniment">
                <div className="settings-extra-note">
                    If you are setting Accompaniment, make sure to also look under the 
                    regular Settings tab to set up how the accompaniment plays.
                    </div>
                </SettingsRow>
                <SettingsRow name="Volume (Velocity)">
                    <SettingsPanel>
                        <SettingsRow name="Minimum Velocity">
                            <KnobSetting settingName="minVelocity"
                                min={0} max={127} step={10} />
                        </SettingsRow>
                        <SettingsRow name="Maximum Velocity">
                            <KnobSetting settingName="maxVelocity"
                                    min={0} max={127} step={10} />
                        </SettingsRow>
                    </SettingsPanel>
                </SettingsRow>
            </SettingsPanel>

        );
    }
}
