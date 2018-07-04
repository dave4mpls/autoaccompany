//
//  Bottom section of the screen that has tabs for different instruments and their settings
//  (piano, drums, etc.)
//
import React, { Component } from 'react';

// MIDI related imports
import AAPlayer from './MIDI/AAPlayer.js';

//-- Sub-component imports
import { PianoKeyboard } from './PianoKeyboard/PianoKeyboard.js';
import { Tab, TabView } from './TabView/TabView.js';

export class InstrumentTabs extends Component {
    render() {
        return (
            <TabView rows={1}>
            <Tab name="🎹 Piano">
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
                id={2} />
            </Tab>
            <Tab name="⚙️ Settings">
            To get to higher and lower octaves in the piano, just scroll left and right.  On mobile devices, drag the grey part below the piano keys to do this.
            </Tab>
          </TabView>
        );
    }
}
