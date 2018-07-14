//
//  PianoKey.js: implements a single key within a PianoKeyboard.
//
import React, { Component } from 'react';
import update from 'immutability-helper';   // license: MIT
import PropTypes from 'prop-types';  // license: MIT
import './PianoKey.css';
import { SettingsStorage } from '../SettingsPanel/Settings.js';

// Piano Key Component -- just one piano key, black or white or, of course, drumpad.  Anything where when you
// press it it makes a note and when you let go the note stops.
export default class PianoKey extends Component {
    static defaultProps = { channel: 0, 
        defaultVelocity: 127, type: "white", shiftBack: false, noteDown: false,
        buttonText: "" };
    
    static propTypes = { id: PropTypes.number.isRequired };

    constructor(props) {
        // Each key keeps state on which keys it has DRAGGED down within our keyboard, when users
        // drag their finger across multiple keys.  This is because each key is in charge of touchmove
        // (but NOT mousemove-- that's different!) until the finger/mouse is released.
        super(props);
        this.state = { keyDownMap: { }, lastKeyDown: -1 };
        this.pitchBend = 8192;  // midrange for MIDI pitch bend -- used if Pitch Control is on
        this.pitchBendCenter = 0; // will be filled in with x coordinate key was depressed at
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
    handlePitchBend() {
        this.props.onPitchBend(this.props.channel, this.pitchBend);
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
      this.pitchBend = 8192;  // reset pitch bend when note goes down
      if (SettingsStorage.getSetting("pitchControlHorizontal")) this.props.onPitchBend(this.props.channel, this.pitchBend);
      this.pitchBendCenter = -1; // set it to this first, so the center gets established on first move
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
                        else if (touchedElement.getAttribute("keyboardnote") == this.props.note) {
                            //-- if user is still touching the original key, check if pitch bend
                            //-- or velocity controls are set on.
                            if (SettingsStorage.getSetting("pitchControlHorizontal")) {
                                //-- Special Feature: Pitch Bend within a key when you drag horizontally!
                                //-- Must be enabled in settings, and only works with MIDI synthesizers
                                //-- since the internal one (WebAudio) has no pitch bend ability.
                                let keyLeft = touchedElement.offsetLeft;
                                let keyWidth = touchedElement.offsetWidth;
                                let userLeft = evt.touches[i].clientX;
                                console.log("userLeft: " + userLeft + ", pitchBendCenter = " + 
                                    this.pitchBendCenter + ", keyLeft: " + keyLeft +
                                    ", keyWidth = " + keyWidth)
                                if (this.pitchBendCenter == -1) this.pitchBendCenter = userLeft;
                                let newPitchBend = 8192;
                                if (userLeft < this.pitchBendCenter)
                                    newPitchBend -= 8192 * ((this.pitchBendCenter - userLeft) / 
                                        (this.pitchBendCenter - keyLeft));
                                else
                                    newPitchBend += 8192 * ((userLeft - this.pitchBendCenter) / 
                                        (keyLeft + keyWidth - this.pitchBendCenter));
                                if (newPitchBend != this.pitchBend) {
                                    this.pitchBend = newPitchBend;
                                    this.handlePitchBend();
                                }
                            }
                        }
                    }
            }
        }
    }
  
    render() {
        // note: the part about shift back is a prop passed by keyboard when you need
        // to shift a key back one whole key since the one before it was a black key
        //
        // also, there needs to be a pointer event for every corresponding mouse event.
        // the pointer events override if pointer is available and work the same way as mouse.
        // strangely, Internet Explorer 11 only has pointer, not touch.
      return (<button 
          className={"piano-key piano-key-" + this.props.type 
            + (this.props.noteDown ? " piano-key-down" : "")
            + ((this.props.shiftBack ? " piano-key-shiftback" : ""))}
          onMouseDown={(evt) => this.handleButtonDown(evt)}
          onMouseUp={(evt) => this.handleButtonUp(evt)}
          onMouseEnter={(evt) => this.handleMouseEnter(evt)}
          onMouseLeave={(evt) => this.handleMouseLeave(evt)}
          onPointerDown={(evt) => this.handleButtonDown(evt)}
          onPointerUp={(evt) => this.handleButtonUp(evt)}
          onPointerEnter={(evt) => this.handleMouseEnter(evt)}
          onPointerLeave={(evt) => this.handleMouseLeave(evt)}
          onTouchStart={(evt) => this.handleButtonDown(evt)}
          onTouchEnd={(evt) => this.handleButtonUp(evt)}
          onContextMenu={(evt) => this.handleIgnoredEvent(evt)}
          onTouchMove={(evt)=> this.handleKeyboardTouchDrag(evt)}
          keyboardid={this.props.id}
          keyboardnote={this.props.note}
          style={this.props.style}
          >{this.props.buttonText}
          </button>)
    }
  }
