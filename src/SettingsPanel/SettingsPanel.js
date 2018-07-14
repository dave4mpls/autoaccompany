//
//  Settings panel in instrument area
//
import React, { Component } from 'react';

// Styles
import './SettingsPanel.css';

function SettingsValueCell(props) {
    return (<td className="settings-table-cell">{props.children}</td>);
}

function SettingsCaptionCell(props) {
    return (<td className="settings-table-cell settings-caption-cell">{props.name}</td>);
}

export function SettingsRow(props) {
    return (<tr><SettingsCaptionCell name={props.name} />
        <SettingsValueCell>{props.children}</SettingsValueCell></tr>);
}

function SettingsTable(props) {
    return (<table className="settings-table"><tbody>{props.children}</tbody></table>);
    }
        
export class SettingsPanel extends Component {
    static defaultProps = {  };

    render() {
        let settingsHeightStyle = {  }; 
        // if no percent screen height, this is a child settings panel, and should not
        // expand to a given height.
        if (this.props.percentScreenHeight) 
            settingsHeightStyle = { minHeight: "170px", height: (this.props.percentScreenHeight) + "vh" };
        return (
            <div style={settingsHeightStyle} className="settings-panel">
                <SettingsTable>
                    { this.props.children }
                </SettingsTable>
            </div>
        );
    }
}
