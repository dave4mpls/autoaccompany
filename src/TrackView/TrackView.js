//
//  Track view for one track (UI).
//  Dave White, 8/6/2018, MIT License
//
import React, { Component } from 'react';
import { Note } from '../Music/Note.js';
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

    formatChannel(ch) {
        if (ch===Note.NT_PLAYBACK_ORIGINAL_CHANNEL)
            return "Original Channel";
        else    
            return "" + ch;
    }

    handleTrackClick() {
        // when the user clicks a track, we select it, within the song.
        if (this.props.track && this.props.track.getProperty("song")) {
            // assuming there is a valid track and song, of course (can't see why there wouldn't be)
            this.props.track.getProperty("song").setSelectedByTrack(this.props.track);
        }
    }

    render() {
        // there's an extra div at the top because it is needed to enclose the actual track as well
        // as the popup component that it opens.
        let trackClassName = "track";
        if (this.props.selected) trackClassName += " track-selected";
        return (
            <div>
            <div className={trackClassName} onClick={()=>this.handleTrackClick()}>
                <table className="track-main-table">
                <tbody>
                    <tr>
                        <td className="track-control-cell">
                            <button className="track-small-button" onClick={()=>this.handleDeleteTrack()}>🗑️ Delete</button><br />
                            <button className="track-small-button" onClick={()=>this.handleEditTrack()}>✏️ Edit</button><br/>
                            <button className="track-small-button" onClick={()=>this.handleSoloButton()}>① Solo</button><br/>
                            <button className="track-small-button" onClick={()=>this.handleMuteButton()}>🔇 Mute</button><br/>
                        </td>
                        <td>
                        <table>
                            <tbody>
                            <tr><td className="track-label-cell"><b>Track Name:</b></td><td className="track-label-cell">{this.props.track.getProperty("name")}</td></tr>
                            <tr><td className="track-label-cell"><b>Track Type:</b></td><td className="track-label-cell">{this.props.track.getProperty("trackType")}</td></tr>
                            <tr><td className="track-label-cell"><b>Instrument:</b></td><td className="track-label-cell">{AAPlayer.instrumentName(this.props.track.getProperty("instrument"))}</td></tr>
                            <tr><td className="track-label-cell"><b>Channel:</b></td><td className="track-label-cell">{this.formatChannel(this.props.track.getProperty("playbackChannel"))}</td></tr>
                            </tbody>
                            </table>
                        </td>
                        <td className="track-pianoroll-cell">
                            <div className="track-pianoroll">
                            </div>
                        </td>
                        <td className="track-control-cell">
                            <button className="track-tall-button" onClick={()=>this.handleMoveTrackUpButton()}>🡅</button>
                            <button className="track-tall-button" onClick={()=>this.handleMoveTrackDownButton()}>🡇</button>
                        </td>
                    </tr>
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

