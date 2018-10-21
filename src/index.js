
// Polyfills, mostly for IE
import 'babel-polyfill';   // required for IE
import 'core-js/es6/map';   // Required polyfill for <=IE11, from npm core-js package.
import 'core-js/es6/set';
import 'raf/polyfill';    // Required 


// Main requirements
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
try { registerServiceWorker(); } catch(e) { }
