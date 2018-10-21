//
//  TabView: some lovely tabs like on my portfolio, 
//  but better, because usable as a react component.
//
import React, { Component } from 'react';
import update from 'immutability-helper';   // license: MIT
import PropTypes from 'prop-types';  // license: MIT
import './TabView.css';

export class Tab extends Component {
    static defaultProps = { caption: "", color: "#009688" };
    static propTypes = { name: PropTypes.string.isRequired };

    render() {
        // Note that the Tab component only renders the inside of the tab content.
        // The outside of the tab and the clicking behavior is rendered by the
        // TabView.
        let thisObject = this; // for closure below.
        return (
            <div className="tabcontent" style={ { display: this.props.displayStyle,
                backgroundColor: this.props.color, height: "100%" }}>
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

    static defaultProps = { startingTab: 0, rows: 1, height: null, color: "#009688", browserFixHeight: "50vh", useBrowserFix: true };
    static propTypes = {  };

    constructor(props) {
        super(props);
        this.state = { tabInfo: this.getTabInfo(this.props.startingTab) }
        //--- See fixBrowserHeightBug function for details on why we create the following ref.
        this.contentSetRef = React.createRef();
    }

    fixBrowserHeightBug() {
        //-- We create the content-set ref in order to access the content set on a timer,
        //-- which we do in order to dynamically correct the problem where Safari < 11.0
        //-- and some older browsers make everything 0 pixels high and mess up the whole layout because the
        //-- parents of many tab controls use flexbox instead of explicit height to set their height.
        //-- The way it works is that first we create the ref that links to the content-set element
        //-- in the DOM for each tab control.  Then we wait a little while for rendering to settle,
        //-- then we see if the actual height of the content set is 0, which means that the line
        //-- in the render function that sets the height to 100% didn't work because some browsers
        //-- won't let you make 100% of a height that is set by flexbox instead of "height".  
        //-- (We leave the height in because otherwise scrolling doesn't work right on modern browsers.)
        //-- If the actual height is zero, we set the style height to "250px" because deleting the
        //-- height makes Safari unable to scroll.  Then everything mostly works everywhere.
        let thisObject = this;
        if (!this.props.useBrowserFix) return;  // caller has option to turn this off-- but why?  They also can set the default height for each separate tab view.
        setTimeout(function() {
            try {
                //console.log("Fix Browser Height started");
                let thisNode = thisObject.contentSetRef.current;
                //console.log("Original Client Height: " + thisNode.clientHeight);
                if (thisNode.clientHeight === 0) {
                    //console.log("Updated Client Height");
                    thisNode.style.height = thisObject.props.browserFixHeight;
                    thisNode.style.overflow = "visible";
                    //setTimeout(function() { console.log("New Content Height: " + thisNode.clientHeight); },500);
                }
            } catch(e) { }
        },500);
    }
    
    reloadTabs(selectedTab) {
        // can be called if you get a ref to the tabview; used to force
        // change when a tab is added/removed by parent
        this.setState(function(prevState) {
            return { tabInfo: this.getTabInfo(selectedTab, { })};
        });
    }

    getTabInfo(newCurrentTab, previousTabInfo = { }) {
        // creates a new tabInfo object with a variety of informataion about the order of the rendered tabs, their widths, etc.
        // It is then stored in the state so when the tabs change they only move when needed.
        let tabInfo = update(previousTabInfo, { });   // clone the previous tab info so it's immutable
        tabInfo.currentTabSourceOrder = newCurrentTab;
        // If this is the initial run, make a tab array.
        if (!tabInfo.tabArray) {
            let childrenArray = React.Children.toArray(this.props.children);
            if (tabInfo.currentTabSourceOrder >= childrenArray.length)
                tabInfo.currentTabSourceOrder = childrenArray.length;
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
        tabInfo.tabHeight = 30;
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
            },
            function() {
                //-- the tabs offer an onTabClick property for when a tab is clicked.
                //-- BUT YOU HAVE TO CALL IT AFTER STATE IS CHANGED, ASYNCHRONOUSLY!
                if (this.props.onTabClick) this.props.onTabClick(this.state.tabInfo.currentTabSourceOrder);
            });
    }

    render() {

        let tabInfo = this.state.tabInfo;
        let thisObject = this;  // for reference by closures below
        let containerStyle = { };
        if (this.props.height) containerStyle.height = this.props.height;
        let contentSetStyle = { };
        if (this.props.color) contentSetStyle.backgroundColor = this.props.color;
        contentSetStyle.height = "100%";
        this.fixBrowserHeightBug();  // fixes the browsers that can't handle the above content set height; see function for details
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
                                fullTabStyle.backgroundColor = thisObject.props.color;
                            }
                            tabcomp.push(<button
                                key = { tabInfo.tabArray[i].index }
                                className = { "tablink " + rowClass }
                                style = { fullTabStyle }
                                onClick = { () => thisObject.handleClick(tabInfo.tabArray[i].index) }
                                >
                                <span className="tablinktext">
                                { tabInfo.tabArray[i].name }
                                </span>
                                </button>);
                        }
                        return tabcomp;  // return list of tabs
                    }()
                }
            </div>
            <div className={ tabContentSetClassName } style={ contentSetStyle } ref={this.contentSetRef} >
            { 
                function() {
                    let tabcomp = [];
                    for (let i = 0; i < tabInfo.tabArray.length; i++)
                    {
                        let displayStyle = (i === tabInfo.currentTabDisplayOrder) ? "block" : "none";
                        tabcomp.push(React.cloneElement(tabInfo.tabArray[i].component, 
                                { displayStyle: displayStyle, color: thisObject.props.color }));
                    }
                    return tabcomp;
                }()
            }
            </div>
            </div>);
    }
}

