//
//  Main application file for Web-based MIDI Auto-Accompaniment Program
//  Created 6/21/2018 by Dave White
//  MIT License
//

// Basic React imports, logo, CSS, etc.
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// Polyfill imports
import 'core-js/es6/map';   // Required polyfill for <=IE11, from npm core-js package.
import 'core-js/es6/set';
import 'raf/polyfill';    // Required 

// MIDI related imports
import MIDI from 'midi.js';   // License: MIT

// Piano Key Component -- just one piano key, black or white
function PianoKey(props) {
  return (<button class="piano-key">&nbsp;&nbsp;</button>)
}

// Piano Keyboard Component -- does the whole piano keyboard
function PianoKeyboard(props) {
  return (<div>{props.children}</div>);
}

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
    MIDI.loadPlugin({
      soundfontUrl: "http://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
      instrument: 'acoustic_grand_piano',
      onsuccess: function ()  {
        myApp.setState({soundsLoaded: true});
        MIDI.programChange(0, "acoustic_grand_piano");
        MIDI.noteOn(0,64,127,0);
        MIDI.noteOff(0,64,127,0.5);
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
          <PianoKeyboard>
            <PianoKey note={64} color="white" />
            <PianoKey note={66} color="white" />
            <PianoKey note={68} color="white" />
            <PianoKey note={69} color="white" />
            <PianoKey note={69} color="white" />
          </PianoKeyboard>
        </div>
      );
    }
  }
}

export default App;
