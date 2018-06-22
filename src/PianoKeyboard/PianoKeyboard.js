//
//  PianoKeyboard.js: Implements screen and computer keyboard driven piano
//  which is used as the default input device.
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
import './PianoKeyboard.css';

// sub-components
import PianoKey from './PianoKey.js';

// No longer needs MIDI components -- this PianoKeyboard can play anything you want, as long
// as it has a suitable sendInputNoteOn and sendInputNoteOff method and you pass it as the
// "player" prop.

// Piano Keyboard Component -- does the whole piano keyboard
// (nota bene: the drum kit is also a kind of piano keyboard, just on the drum channel)

export class PianoKeyboard extends Component {
    static defaultProps = { channel: 0, specificNotes: [ ], 
        specificNoteNames: [ ], minNote: 60, maxNote: 72, percentScreenHeight: 30,
        defaultVelocity: 127, computerKeyboardMap: { },
        };
    
    static propTypes = { id: PropTypes.number.isRequired, player: PropTypes.func.isRequired };
    
    constructor(props) {
        super(props);
        this.state = { lastKeyEvent: "none", lastKey: "_", keyDownMap : { } };
        // the keyDownMap maps note numbers on this keyboard to booleans indicating if the note
        // is down.
    }

    // static routines to help callers set up props
    static ChromaticKeyboardMap(keys, startNote) {
        // returns a keyboard map that starts at the given note, and uses the
        // given keys in chromatic order -- a common need for a keyboard map.
        var outMap = { }; var thisNote = startNote;
        for (let key of keys) {
            outMap[key] = thisNote; thisNote++;
        }
        return outMap;
    }

    // these two handle routines handle events percolating up from the keys.
    handleNoteDown(channel, noteNumber, velocity) {
        if ((this.state.keyDownMap[noteNumber])) return;
        // we ignore double-calls, which for example happen on key repeat.
        this.props.player.sendInputNoteOn(channel, noteNumber, velocity);
        this.setState(function(prevState) {
            const newState = update(prevState, {"keyDownMap": {[noteNumber]: {$set: true } } })
            return newState;
        });
    }

    handleNoteUp(channel, noteNumber) {
        if (!(this.state.keyDownMap[noteNumber])) return;  
        // may get double-called, depending on event sequence, so ignore if already up
        this.props.player.sendInputNoteOff(channel, noteNumber);
        this.setState(function(prevState) {
            const newState = update(prevState, {"keyDownMap": {[noteNumber]: {$set: false } } })
            return newState;
        });
    }

    // Handle (computer) keyboard presses.
    handleComputerKeyEvent(eventName, key) {
        this.setState({lastKeyEvent: eventName, lastKey: key});
        // Get the matching key, and play its note.
        var thisComputerKey = (""+key).toLowerCase();
        if (this.props.computerKeyboardMap.hasOwnProperty(thisComputerKey)) {
            var thisNoteNumber = this.props.computerKeyboardMap[thisComputerKey];
            if (eventName === "KeyDown")
                this.handleNoteDown(this.props.channel, thisNoteNumber, this.props.defaultVelocity);
            else
                this.handleNoteUp(this.props.channel, thisNoteNumber);
        }
    }

    componentDidMount() {
        // attach the keyboard monitors -- note that if more than one piano keyboard is
        // displayed, they all listen for their keystrokes.  you assign different ones, using
        // the computerKeyboardMap prop, to ensure no conflicts
        document.body.addEventListener(
            "keydown", (evt) => this.handleComputerKeyEvent("KeyDown", evt.key));
        document.body.addEventListener(
            "keyup", (evt) => this.handleComputerKeyEvent("KeyUp", evt.key));
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
            var thisKeyType = this.props.channel === this.props.player.MIDI_DRUM_CHANNEL ? 'drums' : 
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

