//
//  Component which has some areas which determine their own size (as rows or columns)
//  and some that are fixed size and some that fill out the remainder of the parent area.
//  Needless to say it auto-resizes.
//
//  Dave White, 7/19/18, MIT License
//
import React, { Component } from 'react';
import './FillRemainderPanel.css';

export class FillRemainderPanel extends Component {
    // Required props: direction (row or column), and sizes (e.g. ["100%","5vh"]) --
    // these are suggested sizes for each child, where 100% means "fill remaining space".
    render() {
        let containerStyle = { };
        let thisObject = this;
        let itemSizes = this.props.sizes;  // e.g. ["100%","5vh"] -- 100% is the fill-remainder one
        let containerClassName = "fill-remainder-container-" + this.props.direction;
        return (
            <div className={ containerClassName }>
            {
                function() {
                    let i = 0;
                    let outArray = [ ];
                    thisObject.props.children.forEach(function(x) {
                        let thisStyle = { 
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: itemSizes[i],
                            msFlexGrow: 1,
                            msFlexShrink: 1,
                            msFlexBasis: itemSizes[i],
                            WebkitFlexGrow: 1,
                            WebkitFlexShrink: 1,
                            WebkitFlexBasis: itemSizes[i]
                            };
                        if (thisObject.props.direction === "row")
                            thisStyle.width = "100%";
                        else
                            thisStyle.height = "100%";
                        if (itemSizes[i] === "100%")
                            thisStyle.overflow = "hidden";
                        outArray.push(
                            <div key={ i } style={ thisStyle }>
                                { x }
                            </div>
                        );
                        i++;
                    });
                    return outArray;
                }()
            }
            </div>
        );
    }
}
