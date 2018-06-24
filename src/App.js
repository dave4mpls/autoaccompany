//
//  Main application file for Web-based MIDI Auto-Accompaniment Program
//  Created 6/21/2018 by Dave White
//  MIT License
//

// Basic React imports, logo, CSS, etc.
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// MIDI related imports
import AAPlayer from './MIDI/AAPlayer.js';

// Sub-component imports
import { PianoKeyboard } from './PianoKeyboard/PianoKeyboard.js';
import { Tab, TabView } from './TabView/TabView.js';

// App Component -- complete app
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      soundsLoaded: false,
    };
  }

  componentDidMount() {
    let myApp = this;   // carry "this" across closure
    AAPlayer.loadPlugin({
      soundfontUrl: "http://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
      instrument: 'acoustic_grand_piano',
      onsuccess: function ()  {
        myApp.setState({soundsLoaded: true});
        // initialize MIDI volume (very important!) and instrument
        AAPlayer.setMasterVolume(127);
        AAPlayer.programChange(0, 0);
        // play startup notes that indicate it's working (debugging)
        AAPlayer.noteOn(0,60,127,0);
        AAPlayer.noteOff(0,60,0.4);
        AAPlayer.chordOn(0, [60,63,67],127,0.5);
        AAPlayer.chordOff(0, [60,63,67], 1.0)
      }
    });
  }

  render() {
    if (!this.state.soundsLoaded) {
      // special rendering situation for sounds not being loaded yet
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Loading Sounds...</h1>
          </header>
        </div>
        );
      }
    else {
      // regular rendering of the app
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Auto-Accompany Placeholder</h1>
          </header>
          <TabView rows={1}>
            <Tab name="Piano">
              <PianoKeyboard 
                computerKeyboardMap={ PianoKeyboard.ChromaticKeyboardMap("1q2w3er5t6yu8i9o0p[=]", 54)}
                player={ AAPlayer }
                minNote={36} 
                maxNote={89} 
                percentScreenHeight={25} 
                id={1} />
            </Tab>
            <Tab name="Drum Kit">
            </Tab>
            <Tab name="Settings">
            To get to higher and lower octaves in the piano, just scroll left and right.  On mobile devices, drag the grey part below the piano keys to do this.
            </Tab>
          </TabView>
        </div>
      );
    }
  }
}

export default App;
