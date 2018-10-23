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
        if (stateObject.playingStatus) {
            // if we are playing, set a timer to turn off the status when playing ends.
            let thisObject = this;
            let playCheckFunction = function() {
                let aSongIsPlaying = false;
                for (var i = 0; i < TrackList.songs.length; i++) {
                    if (TrackList.songs[i].isPlaying()) aSongIsPlaying = true; 
                }
                if (!aSongIsPlaying) { thisObject.setStatus({playingStatus: false}); return; }
                setTimeout(playCheckFunction, 250);
            };
            setTimeout(playCheckFunction, 250);
        }
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
