//
//  Bottom section of the screen that has tabs for different instruments and their settings
//  (piano, drums, etc.)
//
import React, { Component } from 'react';

// MIDI related imports
import { AAPlayer } from './MIDI/AAPlayer.js';

//-- Sub-component imports
import { PianoKeyboard } from './PianoKeyboard/PianoKeyboard.js';
import { Tab, TabView } from './TabView/TabView.js';
import { SettingsPanel, SettingsRow } from './SettingsPanel/SettingsPanel.js';

// Settings widgets
import { InstrumentSelector } from './SettingsPanel/InstrumentSelector.js';
import { MIDIPortSelector } from './SettingsPanel/MIDIPortSelector.js';
import { MIDIKeySelector } from './SettingsPanel/MIDIKeySelector.js';

export class InstrumentTabs extends Component {
    render() {
        return (
            <TabView rows={1}>
            <Tab name="🎹 Keyboard">
              <PianoKeyboard 
                computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("1q2w3er5t6yu8i9o0p[=]", 54)}
                player={ AAPlayer }
                channel={0}
                minNote={36} 
                maxNote={89} 
                percentScreenHeight={25} 
                id={1} />
            </Tab>
            <Tab name="🥁 Drums">
              <PianoKeyboard
                computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("asdfghjkl;'zxcvbnm,./", 36)}
                channel={9}
                player={ AAPlayer }
                minNote={36}
                maxNote={81}
                percentScreenHeight={12}
                id={2} />
              <PianoKeyboard
                channel={9}
                player={ AAPlayer }
                minNote={36}
                maxNote={81}
                percentScreenHeight={13}
                id={3} />
            </Tab>
            <Tab name="⚙️ Settings">
                <SettingsPanel percentScreenHeight={25}>
                    <SettingsRow name="Instrument on Screen Keyboard">
                        <InstrumentSelector channel={0} />
                    </SettingsRow>
                </SettingsPanel>
            </Tab>
            <Tab name="⚙️ MIDI Hardware">
                <SettingsPanel percentScreenHeight={25}>
                    <SettingsRow name="Output">
                        <MIDIPortSelector portType="output" />
                    </SettingsRow>
                    <SettingsRow name="Input">
                        <MIDIPortSelector portType="input" />
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
                </SettingsPanel>
            </Tab>
          </TabView>
        );
    }
}
