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
import { RecordingControls } from './TrackView/RecordingControls.js';

// Settings panels
import { HiddenSettingsArea } from './SettingsPanel/HiddenSettingsArea.js';
import { FillRemainderPanel } from './FillRemainderPanel/FillRemainderPanel.js';

export class InstrumentTabs extends Component {
    render() {
        return (
            <TabView rows={1}>
            <Tab name="🎹 Keyboard">
                <FillRemainderPanel direction="column" sizes={["0vw","100%"]}>
                    <HiddenSettingsArea style={{ height: "100%" }} settingName="recordPanelByKeyboard">
                        <RecordingControls compact={true} />
                    </HiddenSettingsArea>
                    <div>
                        <PianoKeyboard 
                            computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("1q2w3er5t6yu8i9o0p[=]", 54)}
                            player={ AAPlayer }
                            channel={0}
                            minNote={21} 
                            maxNote={108} 
                            percentScreenHeight={25} 
                            id={1} />
                        <HiddenSettingsArea settingName="screenAccompanimentKeyboard">
                            <PianoKeyboard 
                                computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("a~s~df~g~h~jk~l~;'", 60)}
                                player={ AAPlayer }
                                channel={1}
                                minNote={21} 
                                maxNote={108} 
                                percentScreenHeight={25} 
                                id={4} />
                        </HiddenSettingsArea>
                    </div>
                </FillRemainderPanel>
            </Tab>
            <Tab name="🥁 Drums">
                <FillRemainderPanel direction="column" sizes={["0vw","100%"]}>
                    <HiddenSettingsArea settingName="recordPanelByKeyboard">
                        <RecordingControls compact={true} />
                    </HiddenSettingsArea>
                    <div>
                        <PianoKeyboard
                            computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("zxcvbnm,./", 36)}
                            channel={9}
                            player={ AAPlayer }
                            minNote={35}
                            maxNote={81}
                            percentScreenHeight={12}
                            id={2} />
                        <PianoKeyboard
                            channel={9}
                            player={ AAPlayer }
                            minNote={35}
                            maxNote={81}
                            percentScreenHeight={13}
                            id={3} />
                    </div>
                </FillRemainderPanel>
            </Tab>
            <Tab name="↓ Minimize">
            </Tab>
          </TabView>
        );
    }
}
