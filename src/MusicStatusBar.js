//
//  Top section of the screen that has tabs for recording and settings options.
//
import React, { Component } from 'react';

// MIDI related imports
import { AAPlayer } from './MIDI/AAPlayer.js';
import { TrackStorage, TrackList } from './Music/TrackStorage.js';
import './MusicStatusBar.css';

export class MusicStatusBar extends Component {
    constructor(props) {
        super(props);
        let thisObject = this;
        this.state = { recordingStatus: false, playingStatus: false, statusBarMessage: "" };
    }

    setStatus(stateObject) {
        // public function: sets the status of the status bar, resulting in re-rendering
        this.setState(stateObject);
    }

    getStatus() {
        return this.state;
    }

    render() {
        var recordingClassName;
        var recordingStatusName;
        var playingStatusName;
        if (this.state.recordingStatus) {
            recordingStatusName = "RECORDING";
            recordingClassName = "msb-recording";
        }
        else {
            recordingStatusName = "not recording";
            recordingClassName = "msb-not-recording";
        }
        if (this.state.playingStatus) {
            playingStatusName = "PLAYING";
        }
        else {
            playingStatusName = "not playing";
        }
        return (
            <div className="music-status-bar">
                <b>Musical Playground</b>:&nbsp; 
                    <span className={ recordingClassName}>{ recordingStatusName }</span> 
                    &nbsp;-&nbsp;{ playingStatusName } 
                    &nbsp;-&nbsp;<i>{ this.state.statusBarMessage }</i>
            </div>
        );
    }
}
