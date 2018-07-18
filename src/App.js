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
import { SettingsStorage } from './SettingsPanel/Settings.js';
import { Note, Track, TrackStorage, TrackList } from './Music/Tracks.js';
import { MTheory } from './Music/MusicTheory.js';

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
        // initialize MIDI volume (very important!) and instrument
        AAPlayer.setMasterVolume(127);
        AAPlayer.programChange(0, 0);
        AAPlayer.programChange(9, 0);  // change to standard drum kit
        // next: load settings from the persistent store (localStorage)
        SettingsStorage.load();
        // we use the loaded settings to set up the MIDI inputs/outputs
        if (AAPlayer.supportsMIDI()) {
          AAPlayer.setInput(SettingsStorage.getSetting("currentInput"));
          AAPlayer.setOutput(SettingsStorage.getSetting("currentOutput"));
        }
        // we set the programs on all the channels AFTER setting input/output!
        // note that this automatically loads any extra instruments since we
        // send it like a midi instrument would
        for (let i = 0; i < 16; i++) {
          AAPlayer.sendInputProgramChangeWithInstrumentLoad(i, 
            SettingsStorage.getSettingArray("currentInstrument", i));
        }
        // play startup notes that indicate it's working (debugging)
        AAPlayer.noteOn(0,60,127,0);
        AAPlayer.noteOff(0,60,0.4);
        AAPlayer.chordOn(0, [60,63,67],127,0.5);
        AAPlayer.chordOff(0, [60,63,67], 1.0);
        // developers particularly appreciate global access to the AAPlayer and
        // SettingsStorage objects
        window.AAPlayer = AAPlayer;
        window.SettingsStorage = SettingsStorage;
        window.MTheory = MTheory;
        window.TrackList = TrackList;
        // finally, set the app state that we are loaded, so the app displays
        myApp.setState({soundsLoaded: true});
      }
    });
  }

  render() {
    if (!this.state.soundsLoaded) {
      // special rendering situation for sounds not being loaded yet
      return (
        <div className="App">
          <header className="App-header">
            <h1 className="App-title">Loading Sounds...</h1>
          </header>
        </div>
        );
      }
    else {
      // regular rendering of the app
      return (
        <div className="App">
          <div className = "App-top">
            This is the top half where the tracks will go!<br/>
            And so on and so forth<br/>
          </div>
          <div className = "App-bottom">
            <InstrumentTabs />
          </div>
        </div>
      );
    }
  }
}

export default App;
