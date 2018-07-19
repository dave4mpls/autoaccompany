//
//  MIDI Hardware Settings List for Musical Playground
//  Dave White, 7/19/18, MIT License
//
import React, { Component } from 'react';

import { SettingsPanel, SettingsRow } from './SettingsPanel.js';

import { MIDIPortSelector } from './MIDIPortSelector.js';
import { MIDIKeySelector } from './MIDIKeySelector.js';
import { NumericSetting, ToggleSetting } from './GenericSettings.js';

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
                <SettingsRow name="Special Keys">
                    <div className="settings-extra-note">
                    You can assign keys on your piano keyboard to do tasks, so 
                    you don't have to go back to the computer.  
                    </div>
                    <SettingsPanel>
                        <SettingsRow name="Record">
                            <MIDIKeySelector 
                                settingName="recordKey" 
                                settingLongName="Record Key" 
                                settingDescription="This key starts the recording, on the track selected under the record button." 
                                />
                        </SettingsRow>
                        <SettingsRow name="Finish/Start Recording Next">
                            <MIDIKeySelector 
                                settingName="finishStartKey" 
                                settingLongName="Finish/Start Recording Next Key"
                                settingDescription="This key stops the current recording, starts it playing on repeat (so, press it as the downbeat of the next measure after the one you just did), and continues recording on the next track.  You can use this to easily record and layer multiple tracks, but you have to set up the tracks first (adding them, setting their instruments, use of accompaniment keys, etc.)."
                                />
                        </SettingsRow>
                        <SettingsRow name="Stop">
                            <MIDIKeySelector 
                                settingName="stopKey" 
                                settingLongName="Stop Key"
                                settingDescription="This key stops the current recording and all playback."
                                />
                        </SettingsRow>
                        <SettingsRow name="Play">
                            <MIDIKeySelector 
                                settingName="playKey" 
                                settingLongName="Play Key"
                                settingDescription="This key plays the song."
                                />
                        </SettingsRow>
                        <SettingsRow name="Rewind">
                            <MIDIKeySelector 
                                settingName="rewindKey" 
                                settingLongName="Rewind Key"
                                settingDescription="This key rewinds to the start."
                                playNote={true}
                                />
                        </SettingsRow>
                    </SettingsPanel>
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
                            <NumericSetting settingName="minVelocity"
                                min={0} max={127} step={10} />
                        </SettingsRow>
                        <SettingsRow name="Maximum Velocity">
                            <NumericSetting settingName="maxVelocity"
                                    min={0} max={127} step={10} />
                        </SettingsRow>
                    </SettingsPanel>
                </SettingsRow>
            </SettingsPanel>

        );
    }
}
