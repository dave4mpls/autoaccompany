//
//  Top section of the screen that has tabs for recording and settings options.
//
import React, { Component } from 'react';

// MIDI related imports
import { AAPlayer } from './MIDI/AAPlayer.js';

//-- Sub-component imports
import { PianoKeyboard } from './PianoKeyboard/PianoKeyboard.js';
import { Tab, TabView } from './TabView/TabView.js';

// Settings panels
import { MIDIHardwareSettings } from './SettingsPanel/MIDIHardwareSettings.js';
import { MainSettings } from './SettingsPanel/MainSettings.js';

export class RecordingArea extends Component {
    render() {
        return (
            <TabView rows={1} color="#07c5b2">
                <Tab name="🎶 Tracks">
                </Tab>
                <Tab name="⚙️ Settings">
                    <MainSettings />
                </Tab>
                <Tab name="⚙️ MIDI Hardware">
                    <MIDIHardwareSettings />
                </Tab>
            </TabView>
        );
    }
}
