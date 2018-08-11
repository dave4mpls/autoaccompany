//
//  Track view for one track (UI).
//  Dave White, 8/6/2018, MIT License
//
import React, { Component } from 'react';
import { TrackList } from '../Music/TrackStorage.js';
import { SettingsPanel, SettingsRow } from '../SettingsPanel/SettingsPanel.js';
import { Song } from '../Music/Song.js';
import { Track } from '../Music/Track.js';
import './TrackStyles.css';

// uses popups
import Popup from "reactjs-popup";
import '../PopupStyles.css';

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class TrackView extends Component {
    static defaultProps = {  };
    constructor(props) {
        super(props);
        let thisObject = this;
        this.state = { versionNumber: 0, open: false, songName: thisObject.props.track.getProperty("name") };
        // Add events to the track to make sure we get told when it updates
        this.props.track.attachEventHandler("onChange", function() {
            thisObject.setState(function(prevState) {
                return { versionNumber: thisObject.props.song.getVersionNumber() }
            }, function() {
                // things to do after state is set
            });
        })
    }
    handleDeleteTrack() {
        if (window.confirm("Are you sure you want to delete this track?"))
            window.alert("TODO: finish delete track");
    }
    handleEditTrack() {
        // for editing the song we open the popup window.
        this.openPopup();
    }
    handleTrackNameChange(evt) {
        this.setState( { trackName: evt.target.value });
    }
    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.props.track.setProperty("name",this.state.trackName);
        this.setState( {open: false} );
    }

    defaultForEvent(evt) {
        evt.stopPropagation();
    }

    render() {
        return (
            <div>
            <div className="track">
                <table>
                <tbody>
                <tr><td><b>Track Name:</b></td><td>{this.props.track.getProperty("name")}</td></tr>
                <tr><td><b>Track Type:</b></td><td>{this.props.track.getProperty("trackType")}</td></tr>
                <tr><td><b>Instrument:</b></td><td>{AAPlayer.instrumentName(this.props.track.getProperty("instrument"))}</td></tr>
                <tr><td><b>Channel:</b></td><td>{this.props.track.getProperty("playbackChannel")}</td></tr>
                </tbody>
                </table>
            </div>
            <Popup 
                open={this.state.open} 
                closeOnDocumentClick={true} 
                contentStyle={{ width: "70%" }}
                onClose={()=>this.closePopup()} >
            <div className="modal">
            <a className="popup-close-button" onClick={()=>this.closePopup()}>
                &times;
            </a>
            <h3>Edit Track Information</h3>
            <SettingsPanel>
                <SettingsRow name="Track Name">
                    <input onChange={(evt)=>this.handleTrackNameChange(evt)} 
                        onKeyDown={(evt)=>this.defaultForEvent(evt)}
                        onKeyUp={(evt)=>this.defaultForEvent(evt)}
                        value={ this.state.songName } 
                        className="track-input" /></SettingsRow>
            </SettingsPanel>
            <br />
            <button className="settings-popup-button" onClick={()=>this.closePopup()}>
            Save
            </button><br />
            </div>
            </Popup>
            </div>
        );
    }
}

