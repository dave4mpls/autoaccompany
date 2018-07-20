//
//  MIDI Hardware Settings List for Musical Playground
//  Dave White, 7/19/18, MIT License
//
import React, { Component } from 'react';

import { SettingsPanel, SettingsRow } from './SettingsPanel.js';

import { InstrumentSelector } from './InstrumentSelector.js';
import { MIDIKeySelector } from './MIDIKeySelector.js';
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
                        <SettingsRow name="Record Buttons Left of Keyboard">
                            <ToggleSetting settingName="recordPanelByKeyboard" />
                        </SettingsRow>
                        <SettingsRow name="Second Keyboard">
                            <ToggleSetting settingName="screenAccompanimentKeyboard" />
                        </SettingsRow>
                        <HiddenSettingsArea settingName="screenAccompanimentKeyboard" rowLabel="Second Instrument">
                            <InstrumentSelector channel={1} />
                        </HiddenSettingsArea>
                    </SettingsPanel>
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
                                settingDescription="This key starts the recording, on the track selected in the track area.  It does not play the other parts while you are recording." 
                                />
                        </SettingsRow>
                        <SettingsRow name="Play and Record">
                            <MIDIKeySelector 
                                settingName="playRecordKey" 
                                settingLongName="Play and Record Key"
                                settingDescription="This key starts the recording, on the track selected in the track area.  It plays the other tracks as background while you record."
                                />
                        </SettingsRow>
                        <SettingsRow name="Record Next">
                            <MIDIKeySelector 
                                settingName="recordNextKey" 
                                settingLongName="Record Next Key"
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
            </SettingsPanel>
        );
    }
}
