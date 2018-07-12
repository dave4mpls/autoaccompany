//
//  Settings storage for Musical Playground
//  Created 6/21/2018 by Dave White
//  MIT License
//

//  Settings are stored in this one object so that it can be eventually
//  persisted to local storage or somewhere, in a future version.

export class SettingsStorage {
    static currentInstrument = [0,0,0,0,0,0,0,0,0,128,0,0,0,0,0,0];
    static currentInput = ["internal"];
    static currentOutput = ["internal"];
}
