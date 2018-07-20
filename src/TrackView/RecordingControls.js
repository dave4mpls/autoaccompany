//
//  Recording controls on the left hand side of the tracks.
//  Dave White, 7/20/18, MIT License
//
import React, { Component } from 'react';
import './RecordingControls.css';

// MIDI related imports
import { AAPlayer } from '../MIDI/AAPlayer.js';

class RecordingButton extends Component {
    static defaultPrompts = { compact: false, color: "black" };
    render() {
        let textClassName = "recording-button-text-visible";
        if (this.props.compact) 
            textClassName = "recording-button-text-hidden";
        let textStyle = { color: this.props.color };
        return (
            <button className="recording-button">
                { this.props.symbol }
                <span className={ textClassName } style={ textStyle }>
                { " " + this.props.name + " " }
                </span>
            </button>
        );
    }
}

export class RecordingControls extends Component {
    static defaultProps = { compact: false };
    render() {
        return (
            <div className="recording-controls-container">
                <RecordingButton symbol="⏺️️" name="Record" color="red" compact={this.props.compact} />
                <RecordingButton symbol="⏺️▶️" name="Play & Record" color="red" compact={this.props.compact} />
                <RecordingButton symbol="⏺️⏭️" name="Record Next" color="red" compact={this.props.compact} />
                <RecordingButton symbol="⏹️" name="Stop" compact={this.props.compact} />
                <RecordingButton symbol="️️▶️" name="Play" compact={this.props.compact} />
                <RecordingButton symbol="️️⏪" name="Rewind" compact={this.props.compact} />
            </div>
        );
    }
}
