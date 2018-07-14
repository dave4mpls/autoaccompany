//
//  Main application file for Web-based MIDI Auto-Accompaniment Program (Musical Playground)
//  Created 6/21/2018 by Dave White
//  MIT License
//

// Basic React imports, logo, CSS, etc.
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// MIDI related imports
import { AAPlayer } from './MIDI/AAPlayer.js';

// Sub-component imports
import { InstrumentTabs } from './InstrumentTabs.js';

// App Component -- complete app
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      soundsLoaded: false,
      settingsObject: { }
    };
  }

  componentDidMount() {
    let myApp = this;   // carry "this" across closure
    AAPlayer.loadPlugin({
      setupMIDI: true,
      initialSetup: true,
      soundfontUrl: "./soundfonts/",
      instrument: [ 'acoustic_grand_piano', 'drums' ],
      onsuccess: function ()  {
        myApp.setState({soundsLoaded: true});
        // initialize MIDI volume (very important!) and instrument
        AAPlayer.setMasterVolume(127);
        AAPlayer.programChange(0, 0);
        AAPlayer.programChange(9, 0);  // change to standard drum kit
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
          <InstrumentTabs />
        </div>
      );
    }
  }
}

export default App;
