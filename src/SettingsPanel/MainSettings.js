//
//  MIDI Hardware Settings List for Musical Playground
//  Dave White, 7/19/18, MIT License
//
import React, { Component } from 'react';

import { SettingsPanel, SettingsRow } from './SettingsPanel.js';

import { InstrumentSelector } from './InstrumentSelector.js';
import { ToggleSetting } from './GenericSettings.js';
import { HiddenSettingsArea } from './HiddenSettingsArea.js';

export class MainSettings extends Component {
    render() {
        return (
            <SettingsPanel fillAvailableSpace={true} >
                <SettingsRow name="On Screen Keyboard">
                    <SettingsPanel>
                        <SettingsRow name="Instrument">
                            <InstrumentSelector channel={0} />
                        </SettingsRow>
                        <SettingsRow name="Second Keyboard">
                            <ToggleSetting settingName="screenAccompanimentKeyboard" />
                        </SettingsRow>
                        <HiddenSettingsArea settingName="screenAccompanimentKeyboard" rowLabel="Second Instrument">
                            <InstrumentSelector channel={1} />
                        </HiddenSettingsArea>
                    </SettingsPanel>
                </SettingsRow>
            </SettingsPanel>
        );
    }
}
