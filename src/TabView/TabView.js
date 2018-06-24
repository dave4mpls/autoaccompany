//
//  TabView: some lovely tabs like on my portfolio, 
//  but better, because usable as a react component.
//
import React, { Component } from 'react';
import update from 'immutability-helper';   // license: MIT
import PropTypes from 'prop-types';  // license: MIT
import './TabView.css';

export class Tab extends Component {
    static defaultProps = { caption: "" };
    static propTypes = { name: PropTypes.string.isRequired };

    render() {
        // Note that the Tab component only renders the inside of the tab content.
        // The outside of the tab and the clicking behavior is rendered by the
        // TabView.
        let thisObject = this; // for closure below.
        return (
            <div className="tabcontent" style={ { display: this.props.displayStyle }}>
                {
                    function() {
                        let tabcomp = [];
                        if (thisObject.props.caption + "" !== "") {
                            tabcomp.push(<div key={1} className="tabcaption">
                                { thisObject.props.caption }</div>);
                        }
                        tabcomp.push(thisObject.props.children);
                        return tabcomp;
                    }()
                }
            </div>
        );
    }
}

export class TabView extends Component {
    TAB_VIEW_COLOR = "#009688";

    static defaultProps = { startingTab: 0, rows: 1, height: null };
    static propTypes = {  };

    constructor(props) {
        super(props);
        this.state = { tabInfo: this.getTabInfo(this.props.startingTab) }
    }

    getTabInfo(newCurrentTab, previousTabInfo = { }) {
        // creates a new tabInfo object with a variety of informataion about the order of the rendered tabs, their widths, etc.
        // It is then stored in the state so when the tabs change they only move when needed.
        let tabInfo = update(previousTabInfo, { });   // clone the previous tab info so it's immutable
        tabInfo.currentTabSourceOrder = newCurrentTab;
        // If this is the initial run, make a tab array.
        if (!tabInfo.tabArray) {
            let childrenArray = React.Children.toArray(this.props.children);
            tabInfo.tabArray = [];
            for (let i = 0; i < childrenArray.length; i++) {
                var thisTab = { };
                thisTab.index = i;  // needed since we might move them around later
                thisTab.name = childrenArray[i].props.name;
                thisTab.caption = childrenArray[i].props.caption;
                thisTab.component = childrenArray[i];  // the whole insides!
                tabInfo.tabArray.push(thisTab);
            }
            tabInfo.currentTabDisplayOrder = tabInfo.currentTabSourceOrder;
        }
        else {
        // Not initial run -- find the display index for our new tab.
            for (let i = 0; i < tabInfo.tabArray.length; i++) {
                if (tabInfo.tabArray[i].index === newCurrentTab) tabInfo.currentTabDisplayOrder = i;
            }
        }
        tabInfo.rows = this.props.rows;
        tabInfo.tabHeight = 50;
        tabInfo.zBase = 5;
        tabInfo.tabsPerRow = Math.floor(tabInfo.tabArray.length / tabInfo.rows + 0.5);
        tabInfo.blankTabsAtStart = tabInfo.tabsPerRow * tabInfo.rows - tabInfo.tabArray.length;
        if (tabInfo.tabArray.length < tabInfo.rows) tabInfo.rows = tabInfo.tabArray.length;
        // Calculate the row for each tab.  Save it in a function
        // in case you have to recalc after moving the current tab.
        let calcRowNumbers = function() {
            for (let i = 0; i < tabInfo.tabArray.length; i++) {
                let n = i + tabInfo.blankTabsAtStart;
                tabInfo.tabArray[i].rowNumber = Math.floor(n / tabInfo.tabsPerRow);
            }
        };
        calcRowNumbers();
        // Determine if the current tab is not on the bottom row.  If so,
        // move it there, and change the current tab number.
        if (tabInfo.tabArray[tabInfo.currentTabDisplayOrder].rowNumber !== tabInfo.rows - 1) {
            tabInfo.tabArray.push(tabInfo.tabArray[tabInfo.currentTabDisplayOrder]);  // copy it to end
            tabInfo.tabArray.splice(tabInfo.currentTabDisplayOrder,1);   // remove original reference
            tabInfo.currentTabDisplayOrder = tabInfo.tabArray.length - 1;  // point to new version
            calcRowNumbers();  // recalc row numbers
        }
        return tabInfo;
    }

    handleClick(i) {
        // when a tab is clicked, change the current tab 
        this.setState(function(prevState) {
                return { tabInfo: this.getTabInfo(i, prevState.tabInfo)};
            });
    }

    render() {
        let tabInfo = this.state.tabInfo;
        let thisObject = this;  // for reference by closures below
        let containerStyle = { };
        if (this.props.height) containerStyle.height = this.props.height;
        let tabLinkSetClassName = "tablinkset_" + (tabInfo.rows) + "row";
        let tabContentSetClassName = "tabcontentset_row" + (tabInfo.rows);
        // Render
        return (<div className="tabcontainer" style={ containerStyle} >
            <div className={ tabLinkSetClassName }>
                {
                    function() {   
                        // immediately called function for inner area!
                        // yay I'm learning react as you can see.
                        let tabcomp =  [];
                        let tabStyle = {
                            "width": (100 / tabInfo.tabsPerRow) + "%",
                            "height": tabInfo.tabHeight + "px",
                            };
                    // first render the blank tabs
                        for (let i = 0; i < tabInfo.blankTabsAtStart; i++) {
                            tabcomp.push(<button 
                                key = { tabInfo.tabArray.length + i } 
                                className = "tablink blanktab"
                                style = { tabStyle }
                                >&nbsp;</button>);
                        }
                        // now render the real tabs
                        for (let i = 0; i < tabInfo.tabArray.length; i++) {
                            let rowNumber = tabInfo.tabArray[i].rowNumber;
                            let rowClass = (rowNumber===0?"":(rowNumber===1?"secondrow":"thirdrow"));
                            let fullTabStyle = update(tabStyle, { zIndex: {$set: i + tabInfo.zBase }});
                            if (i===tabInfo.currentTabDisplayOrder) {     // color the current tab
                                fullTabStyle.backgroundColor = thisObject.TAB_VIEW_COLOR;
                            }
                            tabcomp.push(<button
                                key = { tabInfo.tabArray[i].index }
                                className = { "tablink " + rowClass }
                                style = { fullTabStyle }
                                onClick = { () => thisObject.handleClick(tabInfo.tabArray[i].index) }
                                >
                                { tabInfo.tabArray[i].name }
                                </button>);
                        }
                        return tabcomp;  // return list of tabs
                    }()
                }
            </div>
            <div className={ tabContentSetClassName }>
            { 
                function() {
                    let tabcomp = [];
                    for (let i = 0; i < tabInfo.tabArray.length; i++)
                    {
                        let displayStyle = (i === tabInfo.currentTabDisplayOrder) ? "block" : "none";
                        tabcomp.push(React.cloneElement(tabInfo.tabArray[i].component, 
                                { displayStyle: displayStyle }));
                    }
                    return tabcomp;
                }()
            }
            </div>
            </div>);
    }
}

