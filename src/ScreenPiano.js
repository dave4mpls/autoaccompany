//
//  ScreenPiano.js: Implements screen and computer keyboard driven piano
//  which is used as the default input device.
//
//  PianoKey component: Not exported, use a whole pianoKeyboard to allow playing.  But
//  it can have only one key if you want!
//
//  PianoKeyboard component:
//  The id prop is required and must be unique within any given screen, to tell keyboards
//  apart when invoking notes remotely (e.g. when dragging across keys).  Other props
//  have defaults, and control things like channel, range of notes, option to only play
//  notes from a certain array, etc.
//
import React, { Component } from 'react';
import update from 'immutability-helper';   // license: MIT
import PropTypes from 'prop-types';  // license: MIT
import './ScreenPiano.css';

// MIDI related imports
import AAPlayer from './AAPlayer.js';

// Piano Key Component -- just one piano key, black or white or, of course, drumpad.  Anything where when you
// press it it makes a note and when you let go the note stops.
class PianoKey extends Component {
    static defaultProps = { channel: AAPlayer.MIDI_DEFAULT_KEYBOARD_CHANNEL, 
        defaultVelocity: 127, type: "white", shiftBack: false, noteDown: false };
    
    static propTypes = { id: PropTypes.number.isRequired };

    constructor(props) {
        // Each key keeps state on which keys it has DRAGGED down within our keyboard, when users
        // drag their finger across multiple keys.  This is because each key is in charge of touchmove
        // (but NOT mousemove-- that's different!) until the finger/mouse is released.
        super(props);
        this.state = { keyDownMap: { }, lastKeyDown: -1 };
    }

    // here are routines for managing the note state, including note dragging.
    // They figure out which notes to turn on/off based on dragging requirements, then send
    // those signals back to the owning keyboard.
    handleNoteDown(noteNumber) { 
        // now can handle other notes down besides our own, due to dragging
        this.props.onNoteDown(this.props.channel, noteNumber, this.props.defaultVelocity);
        this.setState(function(prevState) {
            return update(prevState, {"lastKeyDown": {$set: noteNumber}, "keyDownMap": {[noteNumber]: {$set: true } } });
        });
    }
    handleNoteUp(noteNumber) { 
        // now can handle other notes up besides our own, due to dragging
        this.props.onNoteUp(this.props.channel, noteNumber);
        this.setState(function(prevState) {
            return update(prevState, {"keyDownMap": {[noteNumber]: {$set: false } } });
        });
    }
    handleAllNotesUp() { 
        // special case: when dragging, we often need to turn off all the OTHER notes that we had on before
        // (just associated with this key, not other keys!)
        for (let noteNumber in this.state.keyDownMap)
            this.props.onNoteUp(this.props.channel, noteNumber);
        this.setState({ keyDownMap: { } });
    }

    handleButtonDown(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      this.handleNoteDown(this.props.note);
    }
  
    handleButtonUp(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      this.handleAllNotesUp();
    }

    handleMouseLeave(evt) {
        // Mouse leave means we may not get a chance to do mouse up, so cancel the note!
        this.handleAllNotesUp();
    }

    handleMouseEnter(evt) {
        // Mouse entering a key is same as pressing it down.  Mouse is handled different
        // from touch.
        if (evt.buttons & 1 !== 0)  // play our note if the left button is down
            this.handleNoteDown(this.props.note);
    }

    handleIgnoredEvent(evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }

    isMyKey(elem, noteNumber = -1) {
        // returns true if the given DOM element is a key in this keyboard,
        // and, optionally, has the given note number.  If you just want to find out
        // if it is any key, leave out noteNumber or set to -1.
        if (elem 
            && elem.hasAttribute("keyboardid")
            && elem.hasAttribute("keyboardnote")
            && elem.getAttribute("keyboardid") === "" + this.props.id)
            {
                // yes, it's one of our keys
                if (noteNumber === -1) 
                    return true;
                else {
                    // we need to know if it's the right one?
                    if (elem.getAttribute("keyboardnote") === "" + noteNumber)
                        return true;
                    else
                        return false;
                }
            }
        else
            return false;
    }

    handleKeyboardTouchDrag(evt) {
        // When the user drags their finger across the keys, we must
        // locate the key they are over, and trigger it instead (only within this keyboard).
        for (let i = 0; i < evt.touches.length; i++) {
            let targetElement = evt.touches[i].target;
            if (this.isMyKey(targetElement, this.props.note)) {
                // only look at touches for OUR key, not for other keys!
                let touchedElement = document.elementFromPoint(evt.touches[i].clientX, evt.touches[i].clientY);
                if (this.isMyKey(touchedElement)) {
                        // user touched a key in our keyboard.  Is it a different key?
                        if (touchedElement.getAttribute("keyboardnote") !== "" + this.state.lastKeyDown) {
                            // okay, now we can turn off all notes we were playing before (each key is monophonic, unlike the keyboard!)
                            this.handleAllNotesUp();
                            // then we can press the note down that we are on.
                            this.handleNoteDown(parseInt(""+touchedElement.getAttribute("keyboardnote"),10));
                        }
                    }
            }
        }
    }
  
    render() {
        // note: the part about shift back is a prop passed by keyboard when you need
        // to shift a key back one whole key since the one before it was a black key
      return (<button 
          className={"piano-key piano-key-" + this.props.type 
            + (this.props.noteDown ? " piano-key-down" : "")
            + ((this.props.shiftBack ? " piano-key-shiftback" : ""))}
          onMouseDown={(evt) => this.handleButtonDown(evt)}
          onMouseUp={(evt) => this.handleButtonUp(evt)}
          onMouseEnter={(evt) => this.handleMouseEnter(evt)}
          onMouseLeave={(evt) => this.handleMouseLeave(evt)}
          onTouchStart={(evt) => this.handleButtonDown(evt)}
          onTouchEnd={(evt) => this.handleButtonUp(evt)}
          onContextMenu={(evt) => this.handleIgnoredEvent(evt)}
          onTouchMove={(evt)=> this.handleKeyboardTouchDrag(evt)}
          keyboardid={this.props.id}
          keyboardnote={this.props.note}
          style={this.props.style}
          >
          </button>)
    }
  }
  
// Piano Keyboard Component -- does the whole piano keyboard
// (nota bene: the drum kit is also a kind of piano keyboard, just on the drum channel)

export class PianoKeyboard extends Component {
    static defaultProps = { channel: 0, specificNotes: [ ], 
        specificNoteNames: [ ], minNote: 60, maxNote: 72, percentScreenHeight: 30,
        defaultVelocity: 127 };
    
    static propTypes = { id: PropTypes.number.isRequired };
    
    constructor(props) {
        super(props);
        this.state = { lastKeyEvent: "none", lastKey: "_", keyDownMap : { } };
        // the keyDownMap maps note numbers on this keyboard to booleans indicating if the note
        // is down.
    }

    // these two handle routines handle events percolating up from the keys.
    handleNoteDown(channel, noteNumber, velocity) {
        AAPlayer.sendInputNoteOn(channel, noteNumber, velocity);
        this.setState(function(prevState) {
            const newState = update(prevState, {"keyDownMap": {[noteNumber]: {$set: true } } })
            return newState;
        });
    }

    handleNoteUp(channel, noteNumber) {
        if (!(this.state.keyDownMap[noteNumber])) return;  
        // may get double-called, depending on event sequence, so ignore if already up
        AAPlayer.sendInputNoteOff(channel, noteNumber);
        this.setState(function(prevState) {
            const newState = update(prevState, {"keyDownMap": {[noteNumber]: {$set: false } } })
            return newState;
        });
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
                id={this.props.id}
                defaultVelocity={this.props.defaultVelocity}
                noteDown={ this.state.keyDownMap[i] }
                type={thisKeyType}
                shiftBack={(thisKeyType==="white" && lastKeyType==="black")}
                channel={this.props.channel} 
                onNoteDown={ (channel, noteNumber, velocity) => 
                    this.handleNoteDown(channel, noteNumber, velocity) }
                onNoteUp={ (channel, noteNumber) =>
                    this.handleNoteUp(channel, noteNumber) }
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

