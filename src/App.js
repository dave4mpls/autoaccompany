//
//  Main application file for Web-based MIDI Auto-Accompaniment Program (Musical Playground)
//  Created 6/21/2018 by Dave White
//  MIT License
//

// Basic React imports, logo, CSS, etc.
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { FillRemainderPanel } from './FillRemainderPanel/FillRemainderPanel.js';

// MIDI related imports
import { AAPlayer } from './MIDI/AAPlayer.js';

// Sub-component imports
import { InstrumentTabs } from './InstrumentTabs.js';
import { RecordingArea } from './RecordingArea.js';
import { SettingsStorage } from './SettingsPanel/Settings.js';
import { TrackList } from './Music/TrackStorage.js';
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
      soundfontUrl: "./soundfonts",
      instrument: [ 0, 128 ],
      onsuccess: function ()  {
        // initialize MIDI volume (very important!) and instrument
        AAPlayer.setMasterVolume(0.8);
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
        // now we set up and load the song data from persistent storage (or create
        // a starter song if none exists)
        TrackList.load();
        if (TrackList.songs.length === 0) {
          TrackList.addNewSong();
        }
        // play startup notes that indicate it's working (debugging)
        var t = AAPlayer.currentTime();
        AAPlayer.noteOn(0,60,127,t);
        AAPlayer.noteOff(0,60,t+0.4);
        AAPlayer.chordOn(0, [60,63,67],127,t+0.5);
        AAPlayer.chordOff(0, [60,63,67], t+1.0);
        // developers particularly appreciate global access to the AAPlayer and
        // SettingsStorage objects
        window.AAPlayer = AAPlayer;
        window.SettingsStorage = SettingsStorage;
        window.MTheory = MTheory;
        window.TrackList = TrackList;
        // we may want to know if we are running under IE
        window.ie = (function(){
          var undef,rv = -1; // Return value assumes failure.
          var ua = window.navigator.userAgent;
          var msie = ua.indexOf('MSIE ');
          var trident = ua.indexOf('Trident/');
      
          if (ua.indexOf('Edge/')) 
              rv = -1;  // Edge is not IE, it's better!
          if (msie > 0) {
              // IE 10 or older => return version number
              rv = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
          } else if (trident > 0) {
              // IE 11 (or newer) => return version number
              var rvNum = ua.indexOf('rv:');
              rv = parseInt(ua.substring(rvNum + 3, ua.indexOf('.', rvNum)), 10);
          }
          return ((rv > -1) ? rv : undef);
        }());
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
      // regular rendering of the app -- notice hack for Internet Explorer
      return (
        <div className="App">
          <FillRemainderPanel direction="row" sizes={ [(window.ie ? "8vh" : "100%"), "5vh"]}>
            <RecordingArea />
            <InstrumentTabs />
          </FillRemainderPanel>
        </div>
      );
    }
  }
}

export default App;
