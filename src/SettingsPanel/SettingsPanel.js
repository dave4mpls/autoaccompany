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
    return (<td className="settings-table-cell">{props.name}</td>);
}

export function SettingsRow(props) {
    return (<tr><SettingsCaptionCell name={props.name} />
        <SettingsValueCell>{props.children}</SettingsValueCell></tr>);
}

function SettingsTable(props) {
    return (<table className="settings-table"><tbody>{props.children}</tbody></table>);
    }
        
export class SettingsPanel extends Component {
    static defaultProps = { percentScreenHeight: 30 };

    render() {
        var settingsHeightStyle = { height: (this.props.percentScreenHeight) + "vh" };
        return (
            <div style={settingsHeightStyle} className="settings-panel">
                <SettingsTable>
                    { this.props.children }
                </SettingsTable>
            </div>
        );
    }
}
