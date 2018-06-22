//
//  ScreenPiano.js: Implements screen and computer keyboard driven piano
//  which is used as the default input device.
//
import React, { Component } from 'react';
import './ScreenPiano.css';

// MIDI related imports
import AAPlayer from './AAPlayer.js';

// Piano Key Component -- just one piano key, black or white
export class PianoKey extends Component {
    static defaultProps = { channel: AAPlayer.MIDI_DEFAULT_KEYBOARD_CHANNEL, 
        defaultVelocity: 127, type: "white", shiftBack: false }

    constructor(props) {
        super(props);
        this.state = { noteDown: false };
    }

    handleNoteDown() {
        AAPlayer.noteOn(this.props.channel,this.props.note, this.props.defaultVelocity, 0);
        this.setState( {noteDown: true});
    }

    handleNoteUp() {
        AAPlayer.noteOff(this.props.channel,this.props.note, 0);
        this.setState( {noteDown: false} );
    }

    handleButtonDown(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      this.handleNoteDown();
    }
  
    handleButtonUp(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      this.handleNoteUp();
    }

    handleMouseLeave(evt) {
        // Mouse leave means we may not get a chance to do mouse up, so cancel the note!
        if (this.state.noteDown) this.handleNoteUp();
    }

    handleIgnoredEvent(evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
  
    render() {
        // note: the part about shift back is a prop passed by keyboard when you need
        // to shift a key back one whole key since the one before it was a black key
      return (<button 
          className={"piano-key piano-key-" + this.props.type 
            + (this.state.noteDown ? " piano-key-down" : "")
            + ((this.props.shiftBack ? " piano-key-shiftback" : ""))}
          onMouseDown={(evt) => this.handleButtonDown(evt)}
          onMouseUp={(evt) => this.handleButtonUp(evt)}
          onMouseLeave={(evt) => this.handleMouseLeave(evt)}
          onTouchStart={(evt) => this.handleButtonDown(evt)}
          onTouchEnd={(evt) => this.handleButtonUp(evt)}
          onContextMenu={(evt) => this.handleIgnoredEvent(evt)}
          onTouchMove={(evt)=> this.handleIgnoredEvent(evt)}
          onMouseMove={(evt)=> this.handleIgnoredEvent(evt)}
          style={this.props.style}
          >
          </button>)
    }
  }
  
// Piano Keyboard Component -- does the whole piano keyboard
// (nota bene: the drum kit is also a kind of piano keyboard, just on the drum channel)

export class PianoKeyboard extends Component {
    static defaultProps = { channel: 0, specificNotes: [ ], 
        specificNoteNames: [ ], minNote: 60, maxNote: 72, percentScreenHeight: 30 };
    
    constructor(props) {
        super(props);
        this.state = { lastKeyEvent: "none", lastKey: "_" };
    }

    handleKeyDown(evt) {
        this.setState({lastKeyEvent: "KeyDown", lastKey: evt.key});
    }

    handleKeyUp(evt) {
        this.setState({lastKeyEvent: "KeyUp", lastKey: evt.key })
    }

    componentDidMount() {
        // attach the keyboard monitors -- note that if more than one piano keyboard is
        // displayed, they all listen for their keystrokes.  you assign different ones, using
        // the keyboardMap prop, to ensure no conflicts
        document.body.addEventListener("keydown", (evt) => this.handleKeyDown(evt));
        document.body.addEventListener("keyup", (evt) => this.handleKeyUp(evt));
    }

    render() {
        var keyHeightStyle = { height: (this.props.percentScreenHeight-5) + "vh" };
        var blackKeyHeightStyle = { height: ((this.props.percentScreenHeight-5) / 2) + "vh" };
        var keyboardHeightStyle = { height: (this.props.percentScreenHeight) + "vh" };
        var keyBuffer = [];
        var allNotes = this.props.specificNotes.slice();
        for (let i = this.props.minNote; i <= this.props.maxNote; i++) allNotes.push(i);
        var lastKeyType = "white";
        for (let i of allNotes) {
            var isBlackKey = ([1, 3, 6, 8, 10].indexOf(i % 12) !== -1);
            var thisKeyType = this.props.channel === AAPlayer.MIDI_DRUM_CHANNEL ? 'drums' : 
                (isBlackKey ? 'black' : 'white');
            // note: we shift a key back using CSS if it's white and the last one was black.
            // that's how we make the keys overlap!
            keyBuffer.push(<PianoKey 
                style={(thisKeyType==='black') ? blackKeyHeightStyle : keyHeightStyle}
                key={i}
                note={i} 
                type={thisKeyType}
                shiftBack={(thisKeyType==="white" && lastKeyType==="black")}
                channel={this.props.channel} 
                />);
            lastKeyType = thisKeyType;
        }
        return (
            <div>
                <div>Last Key Pressed: { this.state.lastKeyEvent + " " + this.state.lastKey }</div>
                <div 
                    className="piano-keyboard"
                    style={keyboardHeightStyle}>
                {keyBuffer}
                </div>
            </div>
        );
    }    
}

