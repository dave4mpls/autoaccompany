//
//  Song area containing songs, one under each tab; which contain tracks (UI).
//  Dave White, 8/6/2018, MIT License
//
import React, { Component } from 'react';
import { Tab, TabView } from '../TabView/TabView.js';
import { TrackList } from '../Music/TrackStorage.js';
import { SongView } from './SongView.js';
import update from 'immutability-helper';   // license: MIT
import './TrackStyles.css';

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

export class SongArea extends Component {
    static defaultProps = {  };
    constructor(props) {
        super(props);
        let thisObject = this;
        this.tabViewRef = React.createRef();  // needed for calling the TabView when we need the tabs to re-render
        this.state = { versionNumber: 0 };
        TrackList.selected = 0;
        this.selectingFlag = false;
        // The SongArea constructor adds events to the TrackList to ensure we
        // get called when the track list changes.
        TrackList.attachEventHandler("onChange", function() {
            if (thisObject.selectingFlag) return;
            thisObject.setState(function(prevState) {
                // first we update the state with the new version number, causing a re-render
                // with the correct # of tabs, selection, etc.
                return update(prevState, {versionNumber: {$set: TrackList._versionNumber }});
            }, function() {
                // then we reload those tabs based on that knowledge, rendering any new
                // or deleted tabs as well!
                thisObject.tabViewRef.current.reloadTabs(TrackList.selected);
            });
        });
    }
    handleTabClick(newTabNumber) {
        this.selectingFlag = true;
        if (newTabNumber >= 0 && newTabNumber < TrackList.songs.length)
             TrackList.select(newTabNumber);
        this.selectingFlag = false;
    }
    handleCreateClick(evt) {
        TrackList.addNewSong();
    }
    render() {
        let songRows = 1;
        if (TrackList.songs.length > 3) songRows = 2;
        let songRenderList = [ ];
        for (let i = 0; i < TrackList.songs.length; i++) {
            songRenderList.push(
                <Tab key={TrackList.songs[i].getId()} name={TrackList.songs[i].getName()}>
                    <SongView song={TrackList.songs[i]} key={TrackList.songs[i].getId()}/>
                </Tab>);
        }
        return (
            <TabView 
                startingTab={ TrackList.selected }
                onTabClick={(newTab)=>this.handleTabClick(newTab) } 
                rows={ songRows } 
                browserFixHeight="auto"
                ref={this.tabViewRef} >
                { songRenderList    }
                <Tab name="➕ New/Open">
                    <div className="track-heading">
                        <button onClick={(evt) => this.handleCreateClick(evt) }>➕Create New Song</button>
                        <button onClick={(evt) => this.handleLoadClick(evt) }>📁Open Song from File</button>
                    </div>
                </Tab>
            </TabView>
        );
    }
}

