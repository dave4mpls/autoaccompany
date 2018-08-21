//
//  Song view for one song containing tracks (UI).
//  Dave White, 8/6/2018, MIT License
//
import React, { Component } from 'react';
import { TrackView } from './TrackView.js';
import { TrackList } from '../Music/TrackStorage.js';
import { SettingsPanel, SettingsRow } from '../SettingsPanel/SettingsPanel.js';
import { Song } from '../Music/Song.js';
import './TrackStyles.css';

// uses popups
import Popup from "reactjs-popup";
import '../PopupStyles.css';


// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class SongView extends Component {
    static defaultProps = {  };
    constructor(props) {
        super(props);
        let thisObject = this;
        this.state = { versionNumber: 0, open: false, songName: thisObject.props.song.getName() };
        // The SongArea constructor adds events to the TrackList to ensure we
        // get called when the track list changes.
        this.props.song.attachEventHandler("onChange", function() {
            thisObject.setState(function(prevState) {
                return { versionNumber: thisObject.props.song.getVersionNumber() }
            }, function() {
                // after rendering the new state, bubble up changes to parent.
                TrackList.fireEvent("onChange", TrackList);
            });
        })
    }
    handleDeleteSong() {
        if (window.confirm("Are you sure you want to delete this song?"))
            TrackList.deleteSongObject(this.props.song);
    }
    handleEditSong() {
        // for editing the song we open the popup window.
        this.openPopup();
    }
    handleSongNameChange(evt) {
        this.setState( { songName: evt.target.value });
    }
    openPopup() {
        this.setState( { open: true} );
    }

    closePopup() {
        this.props.song.setName(this.state.songName);
        this.setState( {open: false} );
    }

    defaultForEvent(evt) {
        evt.stopPropagation();
    }

    render() {
        let thisObject = this;
        return (
            <div className="track-heading">
                <button onClick={()=>this.handleDeleteSong()}>🗑️ Delete Song</button>
                <button onClick={()=>this.handleEditSong()}>✏️ Edit Song</button>
                <div>
                    {
                        function() {
                            let trackRenderList = [];
                            for (let i = 0; i < thisObject.props.song.getTrackCount(); i++) {
                                trackRenderList.push(
                                    <TrackView 
                                        key={i} 
                                        track={thisObject.props.song.getTrack(i)} 
                                        selected={(thisObject.props.song.getSelected()===i)}/>
                                );
                            }
                            return trackRenderList;
                        }()
                    }
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
                <h3>Edit Song Information</h3>
                <SettingsPanel>
                    <SettingsRow name="Song Name">
                        <input onChange={(evt)=>this.handleSongNameChange(evt)} 
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

