//
//	WebAudio-TinySynth originally by g200k at https://github.com/g200kg/webaudio-tinysynth, Apache License
//	This source code has been modified from the original version downloaded 8/28/2018, by Dave White.
//	The modifications will incorporate my Drawbar Synth that I made, along with the ability to download soundfont files
//	as "Quality Level 2" based on the MIDI.js library (MIT Licensed) at https://github.com/mudcube/MIDI.js.
//	The soundfont files used are still based on FluidR3_GM.sf2, but instead of being base64-encoded MP3 files for each note
//	in JavaScript files, they will be a smaller, more efficient binary format for each instrument.
//

"use strict";

//
//  New from DW:
//  Before the actual tinysynth, we also have this Instrument Object that permits a
//  fully adjustable additive-synthesis sound synthesizer, which you can substitute for
//  any patch in the main synthesizer.  I may add features later.  The way adding an instrument
//  object like this works is, it must have a connect() method if you want it to connect into the
//  regular output stream, it must have a send method that accepts midi commands, etc.  Then
//  you send it to setProgramOverride, which takes an array that has two elements, the first being
//  either a string (representing a MIDI output port's ID) or an object (representing a custom
//  instrument module).  The second element of the array is the channel number to redirect output to,
//  or -1 to leave the channel number alone.  After you set that up, any time that patch is selected
//  for a channel, the commands will go through the custom instrument or MIDI output port desired.
//
function drawbarOrgan(inputCtx, harmonicsOverride, envelopeOverride, baseVelocityOverride) {
	//--- A simple and complete Instrument Object with additive harmonics (a.k.a. tonewheels), master volume switch, controllable note buffer using
	//--- the audio clock, envelope adjustments, and whatever else I need.  Pass the audio context when creating.
	//--- The override parameters are optional and can make instruments with different sounds.
	var instrument = this;
	var ctx = inputCtx;
	var max = function (a,b) { return (a>b) ? a : b; };  var min = function (a,b) { return (a<b) ? a : b; };
	var limitval = function(a,b,c) { if (a < b) a = b; if (a > c) a = c; return a; };
	var logAdjust = function(a) { return a*a*a; }   // adjust gain controls (between 0-1) by raising them to the 4th power since hearing is logarithmic (https://www.dr-lex.be/info-stuff/volumecontrols.html)
	//-- internal audio properties-- use set...() methods to change in realtime
	var harmonics = harmonicsOverride || [  [0.5, 8],[1.5, 8],[1, 8],[2, 8],[3, 8],[4, 8],[5, 8],[6, 8],[8, 8] ];   
	var envelope =  envelopeOverride || { "a": 20, "h": 0, "d": 40, "s": 60, "r": 40, "expFlag": 0 };  // A>ttack,H>old,D>ecay,S>ustain,R>elease, exponential
	var baseVelocity = baseVelocityOverride || 40;
	var controlResponse = 0.125;		// # of seconds for a control to take effect (smoothly).
	var drawbarMax = 8;				// max setting on drawbar (0-8)

	//-- this section encapsulates the idea of creating a new slider for the instrument.
	//-- the slider adjust function takes a slider input (always 0-1, and the setupSlider function limits actual inputs to that) and adjusts it to the
	//-- actual range needed by the audioParam.  the slider name is used to create public methods called set<name> and get<name> which
	//-- properly ramp up the audio param.
	var sliderValues = { };
	var setupSlider = function(sliderName, initialSliderValue, sliderAdjustFunction, audioParam) {
		var initialAdjustedValue = sliderAdjustFunction(limitval(initialSliderValue,0,1));
		sliderValues[sliderName] = initialSliderValue;
		audioParam.value = initialAdjustedValue;
		instrument["set" + sliderName] = function(v, startTime) {
			startTime = startTime || ctx.currentTime;
			sliderValues[sliderName] = v;
			audioParam.setTargetAtTime(sliderAdjustFunction(limitval(v,0,1)), startTime, controlResponse/5);
		};
		instrument["get" + sliderName] = function() { return sliderValues[sliderName]; }
	};

	//-- this section implements the main volume control -- you supply a linear ratio 0-1, it applies the exponential or power function to make it sound right.
	var mainGain = ctx.createGain();	// main volume control, all oscillators are connected to it
  setupSlider("MainVolume", 1.0, function(v) { return logAdjust(v); }, mainGain.gain);
  
  //-- the sustain pedal is mostly a flag on individual notes, but there's a main flag too.
  var sustainPedal = false;
	
	//-- here is the main connection for notes to attach to.  If no dynamics compressor gets added, it's also the final connection to outside.
	var noteAttachPoint = mainGain;   // we set this to wherever the notes are supposed to connect to
	var outsideConnector = mainGain;	// main gain connects to outside too (speakers/recording), UNLESS we add other things below, like a dynamic compressor.
	
	//-- our handy organ has wiring for "dynamics compression" to keep everything from overloading.  All current browsers except IE support it (but in case of older browsers we leave it out if it's not there)
	var compressor = null;
	if (ctx.createDynamicsCompressor) {
		compressor = ctx.createDynamicsCompressor();
		mainGain.connect(compressor); outsideConnector = compressor;
		compressor.threshold.setValueAtTime(-50, ctx.currentTime);	// values from MDN page at https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
		compressor.knee.setValueAtTime(40, ctx.currentTime);
		compressor.ratio.setValueAtTime(12, ctx.currentTime);
		compressor.attack.setValueAtTime(0.25, ctx.currentTime);
		compressor.release.setValueAtTime(0.25, ctx.currentTime)		
  }	
  
	//-- this section implements the drawbars, as constant-source nodes.  You can change their "offset" AudioParam using any of the
	//-- ramping or setting functions.
	var drawbarGains = [ ];		// note below: drawbars are volume controls, hence, should use power formula since hearing is logarithmic!
	var drawbarToGain = function(v) { var v1 = (limitval(v,0,drawbarMax)/drawbarMax); return logAdjust(v1); }
	for (var i = 0; i < harmonics.length; i++) {
		drawbarGains[i] = ctx.createConstantSource(); 
		drawbarGains[i].offset.value = drawbarToGain(harmonics[i][1]); 
		drawbarGains[i].start();
	}
	this.getNumDrawbars = function() { return harmonics.length; }
	this.getMaxDrawbarValue = function() { return drawbarMax; }
	this.getDrawbarDefault = function(dbindx) { return harmonics[dbindx][1]; }
	this.setDrawbar = function(dbindx, dbval, startTime) { 
		startTime = startTime || ctx.currentTime; harmonics[dbindx][1] = dbval;
		drawbarGains[dbindx].offset.setTargetAtTime(limitval(dbval,0,drawbarMax)/drawbarMax,startTime, controlResponse/5);
	}
	this.setDrawbarWaveform = function(dbindx, waveform, startTime) {
		setTimeout(function() {
      harmonics[dbindx][2] = waveform;
    }, startTime - ctx.currentTime);
	}
	
	//-- the instrument has an array of frequency modulators that connect to notes using the function connectFrequencyModulators.
	var frequencyModulators = [ ];
	var connectFrequencyModulators = function(sourceNode) {
		if (sourceNode.detune) { 
			for (var i = 0; i < frequencyModulators.length; i++)
				frequencyModulators[i].connect(sourceNode.detune); 
		}   // ignore if browser doesn't have detune (e.g. Safari)
	};
	
	//-- this section implements a tremolo control (Low Frequency Oscillator for frequency).
	//-- You must connect the frequencyModulator (which may be modified below to add pitch bend) to your notes' detune AudioParam
	//-- for it to work.  Some browsers don't have detune, so use connectFrequencyModulator to handle it.
	var tremolo = ctx.createOscillator();
	var tremoloGain = ctx.createGain(); frequencyModulators.push(tremoloGain);  
	tremolo.connect(tremoloGain);
	setupSlider("TremoloFrequency",0.45,function(fin) { fin = logAdjust(fin); fin = fin * 2 - 1; return 20 + fin * 19; }, tremolo.frequency);  // slider with range 1hz to 38hz, logarithmic
	setupSlider("TremoloGain",0,function(gin) { return gin * 100; }, tremoloGain.gain);   // the 100 in this line is maximum cents displacement for tremolo.
	tremolo.start();
	
	//-- here we implement pitch bend, which is just like tremelo, but the slider controls the pitch bend directly.
	//-- Another one controls pitch bend sensitivity.  Pattern: constant source (1.0) goes through gain controlled by pitch bend controller
	//-- (output -1 to 1), goes through another gain controlled by pitch sensitivity controller (output -9600 to 9600 cents).
	var pitchBend = ctx.createConstantSource(); pitchBend.offset.value = 1.0;
	var pitchBendGain = ctx.createGain(); pitchBend.connect(pitchBendGain); 
	var pitchBendSensitivityGain = ctx.createGain(); pitchBendGain.connect(pitchBendSensitivityGain);
	frequencyModulators.push(pitchBendSensitivityGain);	//-- after it goes through pitch bend and sensitivity, it can modify the note as a frequency modulator.
	setupSlider("PitchBend",0.5, function(pin) { return (pin - 0.5) * 2; }, pitchBendGain.gain);	// the pitch bend gain outputs -1 to 1.
	setupSlider("PitchBendSensitivity",0.04,function(psin) { return (psin) * 9500 + 1; }, pitchBendSensitivityGain.gain);    //-- sensitivity needs to expand that to -9600 to 9600 (cents).  Wow!
	pitchBend.start();
	
	//-- here we add a vibrato circuit.  Vibrato is just an LFO (Low Frequency Oscillator) attached to the gain param of the main volume.
	var vibrato = ctx.createOscillator();
	var vibratoGain = ctx.createGain(); vibratoGain.connect(mainGain.gain); 
	vibrato.connect(vibratoGain);
	setupSlider("VibratoFrequency",0.45,function(fin) { fin = logAdjust(fin); fin = fin * 2 - 1; return 20 + fin * 19; }, vibrato.frequency);  // slider with range 1hz to 38hz, logarithmic
	setupSlider("VibratoGain",0,function(gin) { return gin * 0.4; }, vibratoGain.gain);   // 0.3 means up to 40% of the volume level changes.
	vibrato.start();
	
	//-- connect the instrument to external audio or processing
	this.connect = function(destNode) { outsideConnector.connect(destNode); }	// whatever the outside connector is, gets connected.
	
	//-- this section implements envelopes on any AudioParam
	this.setEnvelope = function(parmName, newValue, startTime) { 	// note: setting envelope during playback uses JS clock, less accurate
		startTime = startTime || ctx.currentTime;
		setTimeout(function() { envelope[parmName] = newValue; }, 1000*min(0, startTime - ctx.currentTime)); 
	} 
	this.getEnvelopeObject = function() { return envelope; }
	this.applyEnvelope = function(audioParam, startValue, maxValue, parms, startTime, noteOnFlag) {  // returns time when envelope call will be finished
		startTime = startTime || ctx.currentTime;
		if (startValue===maxValue) { audioParam.setValueAtTime(startValue,startTime); return; }  // no change-- just set the value at the time
		var rampFunc = function(v,t) { return audioParam.linearRampToValueAtTime(v,t); };  // default ramp function: linear
		var pt = function(pName) { return max(0.005,parms[pName]/1000.0); }  // function for parameters based on time
		var expFlag = parms["expFlag"]; 	// but exponential is a fun option to make bells, for example
		if (expFlag) rampFunc = function(v,t) { if (v===0) v = 0.001; return audioParam.exponentialRampToValueAtTime(v,t); };
		if (expFlag) { startValue = startValue != 0 ? startValue : 0.001; maxValue = maxValue != 0 ? maxValue : 0.001; }  // no zeroes for exponential envelopes
		if (noteOnFlag) {		// note-on part of envelope
			var endAttack = startTime + pt("a"); var endHold = endAttack + pt("h"); var endDecay = endHold + pt("d");
			audioParam.setValueAtTime(startValue,startTime); rampFunc(maxValue,endAttack);	// start and attack ("a")
			audioParam.setValueAtTime(maxValue,endHold);  // hold ("h");
			rampFunc(parms["s"]/100*maxValue,endDecay);  // decay ("d") and sustain % of max value ("s");
			return endDecay;
		} else { 				// note-off part of envelope
			var releaseParm = pt("r"); 
			var endRelease = startTime + releaseParm; var rightBeforeStart = startTime - 0.001;
			audioParam.cancelScheduledValues(endRelease-0.01);   rampFunc(startValue, endRelease);  // cancel any leftover events from note-on before starting note-off release
			return endRelease;
		}
	};
	
	//-- this section implements the main note generation and playback
	var noteModules = [ ];			// all the notes go here
	this.getNumNotesPlaying = function() { return noteModules.length; }   // handy for debugging or displays -- includes those still releasing after being let go
	var noteNumberToFreq = function(midi) { return Math.pow(2, (midi - 69) / 12) * 440.0; }		// convert note-# to frequency
	var noteModule = function(noteNumber, noteVelocity, startTime) {   // create a note and start it at the given clock time; it's buffered till it plays
		//-- object properties
		var note = this; startTime = startTime || ctx.currentTime;	// default start time for note on is now
		note.noteNumber = noteNumber; note.velocity = noteVelocity; note.startTime = startTime; // save parameters for later
		note.noteOn = true; note.noteSuppressed = false; note.noteSustained = false;
		var srcNodes = [ ]; var eGainNodes = [ ];    // we keep track of src's, drawbar gain, and envelope gain nodes
		//--- object methods including stopping the note
		this.stop = function(startTime) { 
			startTime = startTime || ctx.currentTime;	// default start time for note off is now
			if (!note.noteOn) return; note.noteOn = false;   // stop only happens once
			var maxEndedTime = ctx.currentTime;
			for (var i = 0; i < harmonics.length; i++) {
				maxEndedTime = max(maxEndedTime, instrument.applyEnvelope(eGainNodes[i].gain, 0, 1, envelope, startTime, false));
			}
			for (var i = 0; i < harmonics.length; i++) {
				if (i===0) srcNodes[i].onended = function() { note.removeMe(); };  // after note is ended it is removed from note array
				srcNodes[i].stop(maxEndedTime + 0.010);
			}
		};
		this.removeMe = function() {		// removes this object from the instrument's note buffer
			for (var i = 0; i < noteModules.length; i++) {  if (noteModules[i]===note) { noteModules.splice(i,1); return; }  }
		};
		//--- main constructor which also starts the note playing
		for (var i = 0; i < harmonics.length; i++) { 
			var src = ctx.createOscillator(); 
			var eGain = ctx.createGain(); var dGain = ctx.createGain(); var vGain = ctx.createGain();  // e>nvelope, d>rawbar, v>elocity
			srcNodes.push(src); eGainNodes.push(eGain);  // note: dGain is connected to instrument's drawbar, automatically changing when it does
			src.type = (harmonics[i].length > 2 ? harmonics[i][2] : 'sine');   // easily change wave type with fancier harmonics array
			dGain.gain.value = 0; drawbarGains[i].connect(dGain.gain);   // make sure to zero out the drawbar gain node before attaching the drawbar to it-- initial value and drawbar value are added!
			eGain.gain.value = 0; vGain.gain.value = (baseVelocity/127)*(noteVelocity/127)/harmonics.length;
			src.frequency.value = noteNumberToFreq(noteNumber) * harmonics[i][0];
			connectFrequencyModulators(src); 	// allow notes to be modulated by tremolo, pitch bend
			src.connect(eGain); eGain.connect(dGain); dGain.connect(vGain); vGain.connect(noteAttachPoint);
			instrument.applyEnvelope(eGain.gain, 0, 1, envelope, startTime, true);
			src.start(startTime);
		}
  };

  // The synth doesn't call these routines directly, it just calls send, but they are good to
  // have to implement MIDI messages.  The drawbar organ instrument has no channels, it only makes one sound timbre at a time.
  this.noteOn = function(channel, noteNumber, velocity, startTime) {
    noteModules.push(new noteModule(noteNumber, velocity, startTime));
  };
  this.noteOff = function(channel, noteNumber, startTime) {
    for (var i = 0; i < noteModules.length; i++) {	// set all the notes in the instrument that are that note number to "stopping".
      if (noteModules[i].noteNumber === noteNumber) {
        if (sustainPedal) noteModules[i].noteSustained = true;
        else noteModules[i].stop(startTime);
      }
    }
  };
  this.allSoundOff = function(channel) {
    for (var i = 0; i < noteModules.length; i++) {	// set all the notes in the instrument to "stopping".
      noteModules[i].stop(0);
    }
  };
  this.setMidiBend = function(channel, bend, startTime) {
    this.setPitchBend(bend/16384,startTime);
  };
  this.setModulation = function(channel,v,startTime) {
    this.setTremoloGain((v&0x7F)/127,startTime);
  };
  this.setSustain = function(ch,v,t){    // note: I think sustain will work on IE (with no changes?!)
    var ssFunc = function() {
      sustainPedal=(v<64?false:true);
      if(v<64){
        for(var i=noteModules.length-1;i>=0;--i){
          if (noteModules[i].noteSustained) noteModules[i].stop(t);
        }
      }
    };
    if (t - ctx.currentTime < 0.010) ssFunc();
    else setTimeout(ssFunc, t - ctx.currentTime);
  };

  //--- this section implements a public MIDI interface required of all custom instruments
  //--- returns true if it handles it, false if it doesn't, as expected for a custom instrument module
	this.send = function(msg,t) {
    var ch=msg[0]&0xf;
    var cmd=msg[0]&~0xf;
    if(cmd<0x80||cmd>=0x100)
      return false;
    if(ctx.state=="suspended"){ctx.resume();}
    switch(cmd){
    case 0xb0:  /* ctl change: we return false if it should be handled upstream by the default handler for the tinysynth */
      switch(msg[1]){
      case 1:  this.setModulation(ch,msg[2],t); break;
      case 64: this.setSustain(ch,msg[2],t); break;
      case 120:  /* all sound off */
      case 123:  /* all notes off */
      case 124: case 125: case 126: case 127: /* omni off/on mono/poly */
        this.allSoundOff(ch);
        return true;
      default: return false;
      }
      break;
    case 0xc0: return false;  // MUST allow program change away from this custom instrument!
    case 0xe0: this.setMidiBend(ch,(msg[1]+(msg[2]<<7)),t); return true;
    case 0x90: this.noteOn(ch,msg[1],msg[2],t); return true;
    case 0x80: this.noteOff(ch,msg[1],t); return true;
    default: return false;
    }
    return false;
  };
}

//
//
//  Now the main synthesizer object! WebAudioTinySynth, greatly improved to
//  handle Internet Explorer, sampled sounds, custom instruments, while still
//  having the original speedy playback interface, full MIDI implementation, great
//  fallback synthesized sounds, and good details like release of notes properly.
//  And small and compact so I just drop it in my program and it will go!
//
//

function WebAudioTinySynth(opt){
  this.__proto__ = this.sy =
  /* webaudio-tynysynth core object */
  {
    is:"webaudio-tinysynth",
    properties:{
      masterVol:  {type:Number, value:0.5, observer:"setMasterVol"},
      reverbLev:  {type:Number, value:0.3, observer:"setReverbLev"},
      quality:    {type:Number, value:1, observer:"setQuality"},
      debug:      {type:Number, value:0},
      src:        {type:String, value:null, observer:"loadMIDIUrl"},
      loop:       {type:Number, value:0},
      internalcontext: {type:Number, value:1},
      tsmode:     {type:Number, value:0},
      voices:     {type:Number, value:64},
      useReverb:  {type:Number, value:1},
      /**/
    },
    /**/
    program:[
// 1-8 : Piano
      {name:"Acoustic Grand Piano"},    {name:"Bright Acoustic Piano"},
      {name:"Electric Grand Piano"},    {name:"Honky-tonk Piano"},
      {name:"Electric Piano 1"},        {name:"Electric Piano 2"},
      {name:"Harpsichord"},             {name:"Clavi"},
/* 9-16 : Chromatic Perc*/
      {name:"Celesta"},                 {name:"Glockenspiel"},
      {name:"Music Box"},               {name:"Vibraphone"},
      {name:"Marimba"},                 {name:"Xylophone"},
      {name:"Tubular Bells"},           {name:"Dulcimer"},
/* 17-24 : Organ */
      {name:"Drawbar Organ"},           {name:"Percussive Organ"},
      {name:"Rock Organ"},              {name:"Church Organ"},
      {name:"Reed Organ"},              {name:"Accordion"},
      {name:"Harmonica"},               {name:"Tango Accordion"},
/* 25-32 : Guitar */
      {name:"Acoustic Guitar (nylon)"}, {name:"Acoustic Guitar (steel)"},
      {name:"Electric Guitar (jazz)"},  {name:"Electric Guitar (clean)"},
      {name:"Electric Guitar (muted)"}, {name:"Overdriven Guitar"},
      {name:"Distortion Guitar"},       {name:"Guitar harmonics"},
/* 33-40 : Bass */
      {name:"Acoustic Bass"},           {name:"Electric Bass (finger)"},
      {name:"Electric Bass (pick)"},    {name:"Fretless Bass"},
      {name:"Slap Bass 1"},             {name:"Slap Bass 2"},
      {name:"Synth Bass 1"},            {name:"Synth Bass 2"},
/* 41-48 : Strings */
      {name:"Violin"},                  {name:"Viola"},
      {name:"Cello"},                   {name:"Contrabass"},
      {name:"Tremolo Strings"},         {name:"Pizzicato Strings"},
      {name:"Orchestral Harp"},         {name:"Timpani"},
/* 49-56 : Ensamble */
      {name:"String Ensemble 1"},       {name:"String Ensemble 2"},
      {name:"SynthStrings 1"},          {name:"SynthStrings 2"},
      {name:"Choir Aahs"},              {name:"Voice Oohs"},
      {name:"Synth Voice"},             {name:"Orchestra Hit"},
/* 57-64 : Brass */
      {name:"Trumpet"},                 {name:"Trombone"},
      {name:"Tuba"},                    {name:"Muted Trumpet"},
      {name:"French Horn"},             {name:"Brass Section"},
      {name:"SynthBrass 1"},            {name:"SynthBrass 2"},
/* 65-72 : Reed */
      {name:"Soprano Sax"},             {name:"Alto Sax"},
      {name:"Tenor Sax"},               {name:"Baritone Sax"},
      {name:"Oboe"},                    {name:"English Horn"},
      {name:"Bassoon"},                 {name:"Clarinet"},
/* 73-80 : Pipe */
      {name:"Piccolo"},                 {name:"Flute"},
      {name:"Recorder"},                {name:"Pan Flute"},
      {name:"Blown Bottle"},            {name:"Shakuhachi"},
      {name:"Whistle"},                 {name:"Ocarina"},
/* 81-88 : SynthLead */
      {name:"Lead 1 (square)"},         {name:"Lead 2 (sawtooth)"},
      {name:"Lead 3 (calliope)"},       {name:"Lead 4 (chiff)"},
      {name:"Lead 5 (charang)"},        {name:"Lead 6 (voice)"},
      {name:"Lead 7 (fifths)"},         {name:"Lead 8 (bass + lead)"},
/* 89-96 : SynthPad */
      {name:"Pad 1 (new age)"},         {name:"Pad 2 (warm)"},
      {name:"Pad 3 (polysynth)"},       {name:"Pad 4 (choir)"},
      {name:"Pad 5 (bowed)"},           {name:"Pad 6 (metallic)"},
      {name:"Pad 7 (halo)"},            {name:"Pad 8 (sweep)"},
/* 97-104 : FX */
      {name:"FX 1 (rain)"},             {name:"FX 2 (soundtrack)"},
      {name:"FX 3 (crystal)"},          {name:"FX 4 (atmosphere)"},
      {name:"FX 5 (brightness)"},       {name:"FX 6 (goblins)"},
      {name:"FX 7 (echoes)"},           {name:"FX 8 (sci-fi)"},
/* 105-112 : Ethnic */
      {name:"Sitar"},                   {name:"Banjo"},
      {name:"Shamisen"},                {name:"Koto"},
      {name:"Kalimba"},                 {name:"Bag pipe"},
      {name:"Fiddle"},                  {name:"Shanai"},
/* 113-120 : Percussive */
      {name:"Tinkle Bell"},             {name:"Agogo"},
      {name:"Steel Drums"},             {name:"Woodblock"},
      {name:"Taiko Drum"},              {name:"Melodic Tom"},
      {name:"Synth Drum"},              {name:"Reverse Cymbal"},
/* 121-128 : SE */
      {name:"Guitar Fret Noise"},       {name:"Breath Noise"},
      {name:"Seashore"},                {name:"Bird Tweet"},
      {name:"Telephone Ring"},          {name:"Helicopter"},
      {name:"Applause"},                {name:"Gunshot"},
    ],
    drummap:[
// 35
      {name:"Acoustic Bass Drum"},  {name:"Bass Drum 1"},      {name:"Side Stick"},     {name:"Acoustic Snare"},
      {name:"Hand Clap"},           {name:"Electric Snare"},   {name:"Low Floor Tom"},  {name:"Closed Hi Hat"},
      {name:"High Floor Tom"},      {name:"Pedal Hi-Hat"},     {name:"Low Tom"},        {name:"Open Hi-Hat"},
      {name:"Low-Mid Tom"},         {name:"Hi-Mid Tom"},       {name:"Crash Cymbal 1"}, {name:"High Tom"},
      {name:"Ride Cymbal 1"},       {name:"Chinese Cymbal"},   {name:"Ride Bell"},      {name:"Tambourine"},
      {name:"Splash Cymbal"},       {name:"Cowbell"},          {name:"Crash Cymbal 2"}, {name:"Vibraslap"},
      {name:"Ride Cymbal 2"},       {name:"Hi Bongo"},         {name:"Low Bongo"},      {name:"Mute Hi Conga"},
      {name:"Open Hi Conga"},       {name:"Low Conga"},        {name:"High Timbale"},   {name:"Low Timbale"},
      {name:"High Agogo"},          {name:"Low Agogo"},        {name:"Cabasa"},         {name:"Maracas"},
      {name:"Short Whistle"},       {name:"Long Whistle"},     {name:"Short Guiro"},    {name:"Long Guiro"},
      {name:"Claves"},              {name:"Hi Wood Block"},    {name:"Low Wood Block"}, {name:"Mute Cuica"},
      {name:"Open Cuica"},          {name:"Mute Triangle"},    {name:"Open Triangle"},
    ],
    program1:[
      // 1-8 : Piano
      [{w:"sine",v:.4,d:0.7,r:0.1,},{w:"triangle",v:3,d:0.7,s:0.1,g:1,a:0.01,k:-1.2}],
      [{w:"triangle",v:0.4,d:0.7,r:0.1,},{w:"triangle",v:4,t:3,d:0.4,s:0.1,g:1,k:-1,a:0.01,}],
      [{w:"sine",d:0.7,r:0.1,},{w:"triangle",v:4,f:2,d:0.5,s:0.5,g:1,k:-1}],
      [{w:"sine",d:0.7,v:0.2,},{w:"triangle",v:4,t:3,f:2,d:0.3,g:1,k:-1,a:0.01,s:0.5,}],
      [{w:"sine",v:0.35,d:0.7,},{w:"sine",v:3,t:7,f:1,d:1,s:1,g:1,k:-.7}],
      [{w:"sine",v:0.35,d:0.7,},{w:"sine",v:8,t:7,f:1,d:0.5,s:1,g:1,k:-.7}],
      [{w:"sawtooth",v:0.34,d:2,},{w:"sine",v:8,f:0.1,d:2,s:1,r:2,g:1,}],
      [{w:"triangle",v:0.34,d:1.5,},{w:"square",v:6,f:0.1,d:1.5,s:0.5,r:2,g:1,}],
      /* 9-16 : Chromatic Perc*/
      [{w:"sine",d:0.3,r:0.3,},{w:"sine",v:7,t:11,d:0.03,g:1,}],
      [{w:"sine",d:0.3,r:0.3,},{w:"sine",v:11,t:6,d:0.2,s:0.4,g:1,}],
      [{w:"sine",v:0.2,d:0.3,r:0.3,},{w:"sine",v:11,t:5,d:0.1,s:0.4,g:1,}],
      [{w:"sine",v:0.2,d:0.6,r:0.6,},{w:"triangle",v:11,t:5,f:1,s:0.5,g:1,}],
      [{w:"sine",v:0.3,d:0.2,r:0.2,},{w:"sine",v:6,t:5,d:0.02,g:1,}],
      [{w:"sine",v:0.3,d:0.2,r:0.2,},{w:"sine",v:7,t:11,d:0.03,g:1,}],
      [{w:"sine",v:0.2,d:1,r:1,},{w:"sine",v:11,t:3.5,d:1,r:1,g:1,}],
      [{w:"triangle",v:0.2,d:0.5,r:0.2,},{w:"sine",v:6,t:2.5,d:0.2,s:0.1,r:0.2,g:1,}],
      /* 17-24 : Organ */
      [{w:"w9999",v:0.22,s:0.9,},{w:"w9999",v:0.22,t:2,f:2,s:0.9,}],
      [{w:"w9999",v:0.2,s:1,},{w:"sine",v:11,t:6,f:2,s:0.1,g:1,h:0.006,r:0.002,d:0.002,},{w:"w9999",v:0.2,t:2,f:1,h:0,s:1,}],
      [{w:"w9999",v:0.2,d:0.1,s:0.9,},{w:"w9999",v:0.25,t:4,f:2,s:0.5,}],
      [{w:"w9999",v:0.3,a:0.04,s:0.9,},{w:"w9999",v:0.2,t:8,f:2,a:0.04,s:0.9,}],
      [{w:"sine",v:0.2,a:0.02,d:0.05,s:1,},{w:"sine",v:6,t:3,f:1,a:0.02,d:0.05,s:1,g:1,}],
      [{w:"triangle",v:0.2,a:0.02,d:0.05,s:0.8,},{w:"square",v:7,t:3,f:1,d:0.05,s:1.5,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:0.2,s:0.5,},{w:"square",v:1,d:0.03,s:2,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:0.1,s:0.8,},{w:"square",v:1,a:0.3,d:0.1,s:2,g:1,}],
      /* 25-32 : Guitar */
      [{w:"sine",v:0.3,d:0.5,f:1,},{w:"triangle",v:5,t:3,f:-1,d:1,s:0.1,g:1,}],
      [{w:"sine",v:0.4,d:0.6,f:1,},{w:"triangle",v:12,t:3,d:0.6,s:0.1,g:1,f:-1,}],
      [{w:"triangle",v:0.3,d:1,f:1,},{w:"triangle",v:6,f:-1,d:0.4,s:0.5,g:1,t:3,}],
      [{w:"sine",v:0.3,d:1,f:-1,},{w:"triangle",v:11,f:1,d:0.4,s:0.5,g:1,t:3,}],
      [{w:"sine",v:0.4,d:0.1,r:0.01},{w:"sine",v:7,g:1,}],
      [{w:"triangle",v:0.4,d:1,f:1,},{w:"square",v:4,f:-1,d:1,s:0.7,g:1,}],//[{w:"triangle",v:0.35,d:1,f:1,},{w:"square",v:7,f:-1,d:0.3,s:0.5,g:1,}],
      [{w:"triangle",v:0.35,d:1,f:1,},{w:"square",v:7,f:-1,d:0.3,s:0.5,g:1,}],//[{w:"triangle",v:0.4,d:1,f:1,},{w:"square",v:4,f:-1,d:1,s:0.7,g:1,}],//[{w:"triangle",v:0.4,d:1,},{w:"square",v:4,f:2,d:1,s:0.7,g:1,}],
      [{w:"sine",v:0.2,t:1.5,a:0.005,h:0.2,d:0.6,},{w:"sine",v:11,t:5,f:2,d:1,s:0.5,g:1,}],
      /* 33-40 : Bass */
      [{w:"sine",d:0.3,},{w:"sine",v:4,t:3,d:1,s:1,g:1,}],
      [{w:"sine",d:0.3,},{w:"sine",v:4,t:3,d:1,s:1,g:1,}],
      [{w:"w9999",d:0.3,v:0.7,s:0.5,},{w:"sawtooth",v:1.2,d:0.02,s:0.5,g:1,h:0,r:0.02,}],
      [{w:"sine",d:0.3,},{w:"sine",v:4,t:3,d:1,s:1,g:1,}],
      [{w:"triangle",v:0.3,t:2,d:1,},{w:"triangle",v:15,t:2.5,d:0.04,s:0.1,g:1,}],
      [{w:"triangle",v:0.3,t:2,d:1,},{w:"triangle",v:15,t:2.5,d:0.04,s:0.1,g:1,}],
      [{w:"triangle",d:0.7,},{w:"square",v:0.4,t:0.5,f:1,d:0.2,s:10,g:1,}],
      [{w:"triangle",d:0.7,},{w:"square",v:0.4,t:0.5,f:1,d:0.2,s:10,g:1,}],
      /* 41-48 : Strings */
      [{w:"sawtooth",v:0.4,a:0.1,d:11,},{w:"sine",v:5,d:11,s:0.2,g:1,}],
      [{w:"sawtooth",v:0.4,a:0.1,d:11,},{w:"sine",v:5,d:11,s:0.2,g:1,}],
      [{w:"sawtooth",v:0.4,a:0.1,d:11,},{w:"sine",v:5,t:0.5,d:11,s:0.2,g:1,}],
      [{w:"sawtooth",v:0.4,a:0.1,d:11,},{w:"sine",v:5,t:0.5,d:11,s:0.2,g:1,}],
      [{w:"sine",v:0.4,a:0.1,d:11,},{w:"sine",v:6,f:2.5,d:0.05,s:1.1,g:1,}],
      [{w:"sine",v:0.3,d:0.1,r:0.1,},{w:"square",v:4,t:3,d:1,s:0.2,g:1,}],
      [{w:"sine",v:0.3,d:0.5,r:0.5,},{w:"sine",v:7,t:2,f:2,d:1,r:1,g:1,}],
      [{w:"triangle",v:0.6,h:0.03,d:0.3,r:0.3,t:0.5,},{w:"n0",v:8,t:1.5,d:0.08,r:0.08,g:1,}],
      /* 49-56 : Ensamble */
      [{w:"sawtooth",v:0.3,a:0.03,s:0.5,},{w:"sawtooth",v:0.2,t:2,f:2,d:1,s:2,}],
      [{w:"sawtooth",v:0.3,f:-2,a:0.03,s:0.5,},{w:"sawtooth",v:0.2,t:2,f:2,d:1,s:2,}],
      [{w:"sawtooth",v:0.2,a:0.02,s:1,},{w:"sawtooth",v:0.2,t:2,f:2,a:1,d:1,s:1,}],
      [{w:"sawtooth",v:0.2,a:0.02,s:1,},{w:"sawtooth",v:0.2,f:2,a:0.02,d:1,s:1,}],
      [{w:"triangle",v:0.3,a:0.03,s:1,},{w:"sine",v:3,t:5,f:1,d:1,s:1,g:1,}],
      [{w:"sine",v:0.4,a:0.03,s:0.9,},{w:"sine",v:1,t:2,f:3,d:0.03,s:0.2,g:1,}],
      [{w:"triangle",v:0.6,a:0.05,s:0.5,},{w:"sine",v:1,f:0.8,d:0.2,s:0.2,g:1,}],
      [{w:"square",v:0.15,a:0.01,d:0.2,r:0.2,t:0.5,h:0.03,},{w:"square",v:4,f:0.5,d:0.2,r:11,a:0.01,g:1,h:0.02,},{w:"square",v:0.15,t:4,f:1,a:0.02,d:0.15,r:0.15,h:0.03,},{g:3,w:"square",v:4,f:-0.5,a:0.01,h:0.02,d:0.15,r:11,}],
      /* 57-64 : Brass */
      [{w:"square",v:0.2,a:0.01,d:1,s:0.6,r:0.04,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.5,r:0.08,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.2,a:0.04,d:1,s:0.4,r:0.08,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.15,a:0.04,s:1,},{w:"sine",v:2,d:0.1,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.5,r:0.08,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.6,r:0.08,},{w:"sine",v:1,f:0.2,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:0.5,s:0.7,r:0.08,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.5,r:0.08,},{w:"sine",v:1,d:0.1,s:4,g:1,}],
      /* 65-72 : Reed */
      [{w:"square",v:0.2,a:0.02,d:2,s:0.6,},{w:"sine",v:2,d:1,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:2,s:0.6,},{w:"sine",v:2,d:1,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.6,},{w:"sine",v:2,d:1,g:1,}],
      [{w:"square",v:0.2,a:0.02,d:1,s:0.6,},{w:"sine",v:2,d:1,g:1,}],
      [{w:"sine",v:0.4,a:0.02,d:0.7,s:0.5,},{w:"square",v:5,t:2,d:0.2,s:0.5,g:1,}],
      [{w:"sine",v:0.3,a:0.05,d:0.2,s:0.8,},{w:"sawtooth",v:6,f:0.1,d:0.1,s:0.3,g:1,}],
      [{w:"sine",v:0.3,a:0.03,d:0.2,s:0.4,},{w:"square",v:7,f:0.2,d:1,s:0.1,g:1,}],
      [{w:"square",v:0.2,a:0.05,d:0.1,s:0.8,},{w:"square",v:4,d:0.1,s:1.1,g:1,}],
      /* 73-80 : Pipe */
      [{w:"sine",a:0.02,d:2,},{w:"sine",v:6,t:2,d:0.04,g:1,}],
      [{w:"sine",v:0.7,a:0.03,d:0.4,s:0.4,},{w:"sine",v:4,t:2,f:0.2,d:0.4,g:1,}],
      [{w:"sine",v:0.7,a:0.02,d:0.4,s:0.6,},{w:"sine",v:3,t:2,d:0,s:1,g:1,}],
      [{w:"sine",v:0.4,a:0.06,d:0.3,s:0.3,},{w:"sine",v:7,t:2,d:0.2,s:0.2,g:1,}],
      [{w:"sine",a:0.02,d:0.3,s:0.3,},{w:"sawtooth",v:3,t:2,d:0.3,g:1,}],
      [{w:"sine",v:0.4,a:0.02,d:2,s:0.1,},{w:"sawtooth",v:8,t:2,f:1,d:0.5,g:1,}],
      [{w:"sine",v:0.7,a:0.03,d:0.5,s:0.3,},{w:"sine",v:0.003,t:0,f:4,d:0.1,s:0.002,g:1,}],
      [{w:"sine",v:0.7,a:0.02,d:2,},{w:"sine",v:1,t:2,f:1,d:0.02,g:1,}],
      /* 81-88 : SynthLead */
      [{w:"square",v:0.3,d:1,s:0.5,},{w:"square",v:1,f:0.2,d:1,s:0.5,g:1,}],
      [{w:"sawtooth",v:0.3,d:2,s:0.5,},{w:"square",v:2,f:0.1,s:0.5,g:1,}],
      [{w:"triangle",v:0.5,a:0.05,d:2,s:0.6,},{w:"sine",v:4,t:2,g:1,}],
      [{w:"triangle",v:0.3,a:0.01,d:2,s:0.3,},{w:"sine",v:22,t:2,f:1,d:0.03,s:0.2,g:1,}],
      [{w:"sawtooth",v:0.3,d:1,s:0.5,},{w:"sine",v:11,t:11,a:0.2,d:0.05,s:0.3,g:1,}],
      [{w:"sine",v:0.3,a:0.06,d:1,s:0.5,},{w:"sine",v:7,f:1,d:1,s:0.2,g:1,}],
      [{w:"sawtooth",v:0.3,a:0.03,d:0.7,s:0.3,r:0.2,},{w:"sawtooth",v:0.3,t:0.75,d:0.7,a:0.1,s:0.3,r:0.2,}],
      [{w:"triangle",v:0.3,a:0.01,d:0.7,s:0.5,},{w:"square",v:5,t:0.5,d:0.7,s:0.5,g:1,}],
      /* 89-96 : SynthPad */
      [{w:"triangle",v:0.3,a:0.02,d:0.3,s:0.3,r:0.3,},{w:"square",v:3,t:4,f:1,a:0.02,d:0.1,s:1,g:1,},{w:"triangle",v:0.08,t:0.5,a:0.1,h:0,d:0.1,s:0.5,r:0.1,b:0,c:0,}],
      [{w:"sine",v:0.3,a:0.05,d:1,s:0.7,r:0.3,},{w:"sine",v:2,f:1,d:0.3,s:1,g:1,}],
      [{w:"square",v:0.3,a:0.03,d:0.5,s:0.3,r:0.1,},{w:"square",v:4,f:1,a:0.03,d:0.1,g:1,}],
      [{w:"triangle",v:0.3,a:0.08,d:1,s:0.3,r:0.1,},{w:"square",v:2,f:1,d:0.3,s:0.3,g:1,t:4,a:0.08,}],
      [{w:"sine",v:0.3,a:0.05,d:1,s:0.3,r:0.1,},{w:"sine",v:0.1,t:2.001,f:1,d:1,s:50,g:1,}],
      [{w:"triangle",v:0.3,a:0.03,d:0.7,s:0.3,r:0.2,},{w:"sine",v:12,t:7,f:1,d:0.5,s:1.7,g:1,}],
      [{w:"sine",v:0.3,a:0.05,d:1,s:0.3,r:0.1,},{w:"sawtooth",v:22,t:6,d:0.06,s:0.3,g:1,}],
      [{w:"triangle",v:0.3,a:0.05,d:11,r:0.3,},{w:"triangle",v:1,d:1,s:8,g:1,}],
      /* 97-104 : FX */
      [{w:"sawtooth",v:0.3,d:4,s:0.8,r:0.1,},{w:"square",v:1,t:2,f:8,a:1,d:1,s:1,r:0.1,g:1,}],
      [{w:"triangle",v:0.3,d:1,s:0.5,t:0.8,a:0.2,p:1.25,q:0.2,},{w:"sawtooth",v:0.2,a:0.2,d:0.3,s:1,t:1.2,p:1.25,q:0.2,}],
      [{w:"sine",v:0.3,d:1,s:0.3,},{w:"square",v:22,t:11,d:0.5,s:0.1,g:1,}],
      [{w:"sawtooth",v:0.3,a:0.04,d:1,s:0.8,r:0.1,},{w:"square",v:1,t:0.5,d:1,s:2,g:1,}],
      [{w:"triangle",v:0.3,d:1,s:0.3,},{w:"sine",v:22,t:6,d:0.6,s:0.05,g:1,}],
      [{w:"sine",v:0.6,a:0.1,d:0.05,s:0.4,},{w:"sine",v:5,t:5,f:1,d:0.05,s:0.3,g:1,}],
      [{w:"sine",a:0.1,d:0.05,s:0.4,v:0.8,},{w:"sine",v:5,t:5,f:1,d:0.05,s:0.3,g:1,}],
      [{w:"square",v:0.3,a:0.1,d:0.1,s:0.4,},{w:"square",v:1,f:1,d:0.3,s:0.1,g:1,}],
      /* 105-112 : Ethnic */
      [{w:"sawtooth",v:0.3,d:0.5,r:0.5,},{w:"sawtooth",v:11,t:5,d:0.05,g:1,}],
      [{w:"square",v:0.3,d:0.2,r:0.2,},{w:"square",v:7,t:3,d:0.05,g:1,}],
      [{w:"triangle",d:0.2,r:0.2,},{w:"square",v:9,t:3,d:0.1,r:0.1,g:1,}],
      [{w:"triangle",d:0.3,r:0.3,},{w:"square",v:6,t:3,d:1,r:1,g:1,}],
      [{w:"triangle",v:0.4,d:0.2,r:0.2,},{w:"square",v:22,t:12,d:0.1,r:0.1,g:1,}],
      [{w:"sine",v:0.25,a:0.02,d:0.05,s:0.8,},{w:"square",v:1,t:2,d:0.03,s:11,g:1,}],
      [{w:"sine",v:0.3,a:0.05,d:11,},{w:"square",v:7,t:3,f:1,s:0.7,g:1,}],
      [{w:"square",v:0.3,a:0.05,d:0.1,s:0.8,},{w:"square",v:4,d:0.1,s:1.1,g:1,}],
      /* 113-120 : Percussive */
      [{w:"sine",v:0.4,d:0.3,r:0.3,},{w:"sine",v:7,t:9,d:0.1,r:0.1,g:1,}],
      [{w:"sine",v:0.7,d:0.1,r:0.1,},{w:"sine",v:22,t:7,d:0.05,g:1,}],
      [{w:"sine",v:0.6,d:0.15,r:0.15,},{w:"square",v:11,t:3.2,d:0.1,r:0.1,g:1,}],
      [{w:"sine",v:0.8,d:0.07,r:0.07,},{w:"square",v:11,t:7,r:0.01,g:1,}],
      [{w:"triangle",v:0.7,t:0.5,d:0.2,r:0.2,p:0.95,},{w:"n0",v:9,g:1,d:0.2,r:0.2,}],
      [{w:"sine",v:0.7,d:0.1,r:0.1,p:0.9,},{w:"square",v:14,t:2,d:0.005,r:0.005,g:1,}],
      [{w:"square",d:0.15,r:0.15,p:0.5,},{w:"square",v:4,t:5,d:0.001,r:0.001,g:1,}],
      [{w:"n1",v:0.3,a:1,s:1,d:0.15,r:0,t:0.5,}],
      /* 121-128 : SE */
      [{w:"sine",t:12.5,d:0,r:0,p:0.5,v:0.3,h:0.2,q:0.5,},{g:1,w:"sine",v:1,t:2,d:0,r:0,s:1,},{g:1,w:"n0",v:0.2,t:2,a:0.6,h:0,d:0.1,r:0.1,b:0,c:0,}],
      [{w:"n0",v:0.2,a:0.05,h:0.02,d:0.02,r:0.02,}],
      [{w:"n0",v:0.4,a:1,d:1,t:0.25,}],
      [{w:"sine",v:0.3,a:0.1,d:1,s:0.5,},{w:"sine",v:4,t:0,f:1.5,d:1,s:1,r:0.1,g:1,},{g:1,w:"sine",v:4,t:0,f:2,a:0.6,h:0,d:0.1,s:1,r:0.1,b:0,c:0,}],
      [{w:"square",v:0.3,t:0.25,d:11,s:1,},{w:"square",v:12,t:0,f:8,d:1,s:1,r:11,g:1,}],
      [{w:"n0",v:0.4,t:0.5,a:1,d:11,s:1,r:0.5,},{w:"square",v:1,t:0,f:14,d:1,s:1,r:11,g:1,}],
      [{w:"sine",t:0,f:1221,a:0.2,d:1,r:0.25,s:1,},{g:1,w:"n0",v:3,t:0.5,d:1,s:1,r:1,}],
      [{w:"sine",d:0.4,r:0.4,p:0.1,t:2.5,v:1,},{w:"n0",v:12,t:2,d:1,r:1,g:1,}],
    ],
    program0:[
// 1-8 : Piano
      [{w:"triangle",v:.5,d:.7}],                   [{w:"triangle",v:.5,d:.7}],
      [{w:"triangle",v:.5,d:.7}],                   [{w:"triangle",v:.5,d:.7}],
      [{w:"triangle",v:.5,d:.7}],                   [{w:"triangle",v:.5,d:.7}],
      [{w:"sawtooth",v:.3,d:.7}],                   [{w:"sawtooth",v:.3,d:.7}],
/* 9-16 : Chromatic Perc*/
      [{w:"sine",v:.5,d:.3,r:.3}],                  [{w:"triangle",v:.5,d:.3,r:.3}],
      [{w:"square",v:.2,d:.3,r:.3}],                [{w:"square",v:.2,d:.3,r:.3}],
      [{w:"sine",v:.5,d:.1,r:.1}],                  [{w:"sine",v:.5,d:.1,r:.1}],
      [{w:"square",v:.2,d:1,r:1}],                  [{w:"sawtooth",v:.3,d:.7,r:.7}],
/* 17-24 : Organ */
      [{w:"sine",v:0.5,a:0.01,s:1}],                [{w:"sine",v:0.7,d:0.02,s:0.7}],
      [{w:"square",v:.2,s:1}],                      [{w:"triangle",v:.5,a:.01,s:1}],
      [{w:"square",v:.2,a:.02,s:1}],                [{w:"square",v:0.2,a:0.02,s:1}],
      [{w:"square",v:0.2,a:0.02,s:1}],              [{w:"square",v:.2,a:.05,s:1}],
/* 25-32 : Guitar */
      [{w:"triangle",v:.5,d:.5}],                   [{w:"square",v:.2,d:.6}],
      [{w:"square",v:.2,d:.6}],                     [{w:"triangle",v:.8,d:.6}],
      [{w:"triangle",v:.4,d:.05}],                  [{w:"square",v:.2,d:1}],
      [{w:"square",v:.2,d:1}],                      [{w:"sine",v:.4,d:.6}],
/* 33-40 : Bass */
      [{w:"triangle",v:.7,d:.4}],                   [{w:"triangle",v:.7,d:.7}],
      [{w:"triangle",v:.7,d:.7}],                   [{w:"triangle",v:.7,d:.7}],
      [{w:"square",v:.3,d:.2}],                     [{w:"square",v:.3,d:.2}],
      [{w:"square",v:.3,d:.1,s:.2}],                [{w:"sawtooth",v:.4,d:.1,s:.2}],
/* 41-48 : Strings */
      [{w:"sawtooth",v:.2,a:.02,s:1}],              [{w:"sawtooth",v:.2,a:.02,s:1}],
      [{w:"sawtooth",v:.2,a:.02,s:1}],              [{w:"sawtooth",v:.2,a:.02,s:1}],
      [{w:"sawtooth",v:.2,a:.02,s:1}],              [{w:"sawtooth",v:.3,d:.1}],
      [{w:"sawtooth",v:.3,d:.5,r:.5}],              [{w:"triangle",v:.6,d:.1,r:.1,h:0.03,p:0.8}],
/* 49-56 : Ensamble */
      [{w:"sawtooth",v:.2,a:.02,s:1}],              [{w:"sawtooth",v:.2,a:.02,s:1}],
      [{w:"sawtooth",v:.2,a:.02,s:1}],              [{w:"sawtooth",v:.2,a:.02,s:1}],
      [{w:"triangle",v:.3,a:.03,s:1}],              [{w:"sine",v:.3,a:.03,s:1}],
      [{w:"triangle",v:.3,a:.05,s:1}],              [{w:"sawtooth",v:.5,a:.01,d:.1}],
/* 57-64 : Brass */
      [{w:"square",v:.3,a:.05,d:.2,s:.6}],          [{w:"square",v:.3,a:.05,d:.2,s:.6}],
      [{w:"square",v:.3,a:.05,d:.2,s:.6}],          [{w:"square",v:0.2,a:.05,d:0.01,s:1}],
      [{w:"square",v:.3,a:.05,s:1}],                [{w:"square",v:.3,s:.7}],
      [{w:"square",v:.3,s:.7}],                     [{w:"square",v:.3,s:.7}],
/* 65-72 : Reed */
      [{w:"square",v:.3,a:.02,d:2}],                [{w:"square",v:.3,a:.02,d:2}],
      [{w:"square",v:.3,a:.03,d:2}],                [{w:"square",v:.3,a:.04,d:2}],
      [{w:"square",v:.3,a:.02,d:2}],                [{w:"square",v:.3,a:.05,d:2}],
      [{w:"square",v:.3,a:.03,d:2}],                [{w:"square",v:.3,a:.03,d:2}],
/* 73-80 : Pipe */
      [{w:"sine",v:.7,a:.02,d:2}],                  [{w:"sine",v:.7,a:.02,d:2}],
      [{w:"sine",v:.7,a:.02,d:2}],                  [{w:"sine",v:.7,a:.02,d:2}],
      [{w:"sine",v:.7,a:.02,d:2}],                  [{w:"sine",v:.7,a:.02,d:2}],
      [{w:"sine",v:.7,a:.02,d:2}],                  [{w:"sine",v:.7,a:.02,d:2}],
/* 81-88 : SynthLead */
      [{w:"square",v:.3,s:.7}],                     [{w:"sawtooth",v:.4,s:.7}],
      [{w:"triangle",v:.5,s:.7}],                   [{w:"sawtooth",v:.4,s:.7}],
      [{w:"sawtooth",v:.4,d:12}],                   [{w:"sine",v:.4,a:.06,d:12}],
      [{w:"sawtooth",v:.4,d:12}],                   [{w:"sawtooth",v:.4,d:12}],
/* 89-96 : SynthPad */
      [{w:"sawtooth",v:.3,d:12}],                   [{w:"triangle",v:.5,d:12}],
      [{w:"square",v:.3,d:12}],                     [{w:"triangle",v:.5,a:.08,d:11}],
      [{w:"sawtooth",v:.5,a:.05,d:11}],             [{w:"sawtooth",v:.5,d:11}],
      [{w:"triangle",v:.5,d:11}],                   [{w:"triangle",v:.5,d:11}],
/* 97-104 : FX */
      [{w:"triangle",v:.5,d:11}],                   [{w:"triangle",v:.5,d:11}],
      [{w:"square",v:.3,d:11}],                     [{w:"sawtooth",v:0.5,a:0.04,d:11}],
      [{w:"sawtooth",v:.5,d:11}],                   [{w:"triangle",v:.5,a:.8,d:11}],
      [{w:"triangle",v:.5,d:11}],                   [{w:"square",v:.3,d:11}],
/* 105-112 : Ethnic */
      [{w:"sawtooth",v:.3,d:1,r:1}],                [{w:"sawtooth",v:.5,d:.3}],
      [{w:"sawtooth",v:.5,d:.3,r:.3}],              [{w:"sawtooth",v:.5,d:.3,r:.3}],
      [{w:"square",v:.3,d:.2,r:.2}],                [{w:"square",v:.3,a:.02,d:2}],
      [{w:"sawtooth",v:.2,a:.02,d:.7}],             [{w:"triangle",v:.5,d:1}],
/* 113-120 : Percussive */
      [{w:"sawtooth",v:.3,d:.3,r:.3}],              [{w:"sine",v:.8,d:.1,r:.1}],
      [{w:"square",v:.2,d:.1,r:.1,p:1.05}],         [{w:"sine",v:.8,d:.05,r:.05}],
      [{w:"triangle",v:0.5,d:0.1,r:0.1,p:0.96}],    [{w:"triangle",v:0.5,d:0.1,r:0.1,p:0.97}],
      [{w:"square",v:.3,d:.1,r:.1,}],               [{w:"n1",v:0.3,a:1,s:1,d:0.15,r:0,t:0.5,}],
/* 121-128 : SE */
      [{w:"triangle",v:0.5,d:0.03,t:0,f:1332,r:0.001,p:1.1}],
      [{w:"n0",v:0.2,t:0.1,d:0.02,a:0.05,h:0.02,r:0.02}],
      [{w:"n0",v:0.4,a:1,d:1,t:0.25,}],
      [{w:"sine",v:0.3,a:0.8,d:1,t:0,f:1832}],
      [{w:"triangle",d:0.5,t:0,f:444,s:1,}],
      [{w:"n0",v:0.4,d:1,t:0,f:22,s:1,}],
      [{w:"n0",v:0.5,a:0.2,d:11,t:0,f:44}],
      [{w:"n0",v:0.5,t:0.25,d:0.4,r:0.4}],
    ],
    drummap1:[
/*35*/  [{w:"triangle",t:0,f:70,v:1,d:0.05,h:0.03,p:0.9,q:0.1,},{w:"n0",g:1,t:6,v:17,r:0.01,h:0,p:0,}],
        [{w:"triangle",t:0,f:88,v:1,d:0.05,h:0.03,p:0.5,q:0.1,},{w:"n0",g:1,t:5,v:42,r:0.01,h:0,p:0,}],
        [{w:"n0",f:222,p:0,t:0,r:0.01,h:0,}],
        [{w:"triangle",v:0.3,f:180,d:0.05,t:0,h:0.03,p:0.9,q:0.1,},{w:"n0",v:0.6,t:0,f:70,h:0.02,r:0.01,p:0,},{g:1,w:"square",v:2,t:0,f:360,r:0.01,b:0,c:0,}],
        [{w:"square",f:1150,v:0.34,t:0,r:0.03,h:0.025,d:0.03,},{g:1,w:"n0",t:0,f:13,h:0.025,d:0.1,s:1,r:0.1,v:1,}],
/*40*/  [{w:"triangle",f:200,v:1,d:0.06,t:0,r:0.06,},{w:"n0",g:1,t:0,f:400,v:12,r:0.02,d:0.02,}],
        [{w:"triangle",f:100,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.4,h:0.015,d:0.005,r:0.005,}],
        [{w:"n1",f:390,v:0.25,r:0.01,t:0,}],
        [{w:"triangle",f:120,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.5,h:0.015,d:0.005,r:0.005,}],
        [{w:"n1",v:0.25,f:390,r:0.03,t:0,h:0.005,d:0.03,}],
/*45*/  [{w:"triangle",f:140,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.3,h:0.015,d:0.005,r:0.005,}],
        [{w:"n1",v:0.25,f:390,t:0,d:0.2,r:0.2,},{w:"n0",v:0.3,t:0,c:0,f:440,h:0.005,d:0.05,}],
        [{w:"triangle",f:155,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.3,h:0.015,d:0.005,r:0.005,}],
        [{w:"triangle",f:180,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.3,h:0.015,d:0.005,r:0.005,}],
        [{w:"n1",v:0.3,f:1200,d:0.2,r:0.2,h:0.05,t:0,},{w:"n1",t:0,v:1,d:0.1,r:0.1,p:1.2,f:440,}],
/*50*/  [{w:"triangle",f:220,v:0.9,d:0.12,h:0.02,p:0.5,t:0,r:0.12,},{g:1,w:"n0",v:5,t:0.3,h:0.015,d:0.005,r:0.005,}],
        [{w:"n1",f:500,v:0.15,d:0.4,r:0.4,h:0,t:0,},{w:"n0",v:0.1,t:0,r:0.01,f:440,}],
        [{w:"n1",v:0.3,f:800,d:0.2,r:0.2,h:0.05,t:0,},{w:"square",t:0,v:1,d:0.1,r:0.1,p:0.1,f:220,g:1,}],
        [{w:"sine",f:1651,v:0.15,d:0.2,r:0.2,h:0,t:0,},{w:"sawtooth",g:1,t:1.21,v:7.2,d:0.1,r:11,h:1,},{g:1,w:"n0",v:3.1,t:0.152,d:0.002,r:0.002,}],
        null,
/*55*/  [{w:"n1",v:.3,f:1200,d:0.2,r:0.2,h:0.05,t:0,},{w:"n1",t:0,v:1,d:0.1,r:0.1,p:1.2,f:440,}],
        null,
        [{w:"n1",v:0.3,f:555,d:0.25,r:0.25,h:0.05,t:0,},{w:"n1",t:0,v:1,d:0.1,r:0.1,f:440,a:0.005,h:0.02,}],
        [{w:"sawtooth",f:776,v:0.2,d:0.3,t:0,r:0.3,},{g:1,w:"n0",v:2,t:0,f:776,a:0.005,h:0.02,d:0.1,s:1,r:0.1,c:0,},{g:11,w:"sine",v:0.1,t:0,f:22,d:0.3,r:0.3,b:0,c:0,}],
        [{w:"n1",f:440,v:0.15,d:0.4,r:0.4,h:0,t:0,},{w:"n0",v:0.4,t:0,r:0.01,f:440,}],
/*60*/  null,null,null,null,null,
/*65*/  null,null,null,null,null,
/*70*/  null,null,null,null,null,
/*75*/  null,null,null,null,null,
/*80*/  [{w:"sine",f:1720,v:0.3,d:0.02,t:0,r:0.02,},{w:"square",g:1,t:0,f:2876,v:6,d:0.2,s:1,r:0.2,}],
        [{w:"sine",f:1720,v:0.3,d:0.25,t:0,r:0.25,},{w:"square",g:1,t:0,f:2876,v:6,d:0.2,s:1,r:0.2,}],
    ],
    drummap0:[
/*35*/[{w:"triangle",t:0,f:110,v:1,d:0.05,h:0.02,p:0.1,}],
      [{w:"triangle",t:0,f:150,v:0.8,d:0.1,p:0.1,h:0.02,r:0.01,}],
      [{w:"n0",f:392,v:0.5,d:0.01,p:0,t:0,r:0.05}],
      [{w:"n0",f:33,d:0.05,t:0,}],
      [{w:"n0",f:100,v:0.7,d:0.03,t:0,r:0.03,h:0.02,}],
/*40*/[{w:"n0",f:44,v:0.7,d:0.02,p:0.1,t:0,h:0.02,}],
      [{w:"triangle",f:240,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"n0",f:440,v:0.2,r:0.01,t:0,}],
      [{w:"triangle",f:270,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"n0",f:440,v:0.2,d:0.04,r:0.04,t:0,}],
/*45*/[{w:"triangle",f:300,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"n0",f:440,v:0.2,d:0.1,r:0.1,h:0.02,t:0,}],
      [{w:"triangle",f:320,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"triangle",f:360,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"n0",f:150,v:0.2,d:0.1,r:0.1,h:0.05,t:0,p:0.1,}],
/*50*/[{w:"triangle",f:400,v:0.9,d:0.1,h:0.02,p:0.1,t:0,}],
      [{w:"n0",f:150,v:0.2,d:0.1,r:0.01,h:0.05,t:0,p:0.1}],
      [{w:"n0",f:150,v:0.2,d:0.1,r:0.01,h:0.05,t:0,p:0.1}],
      [{w:"n0",f:440,v:0.3,d:0.1,p:0.9,t:0,r:0.1,}],
      [{w:"n0",f:200,v:0.2,d:0.05,p:0.9,t:0,}],
/*55*/[{w:"n0",f:440,v:0.3,d:0.12,p:0.9,t:0,}],
      [{w:"sine",f:800,v:0.4,d:0.06,t:0,}],
      [{w:"n0",f:150,v:0.2,d:0.1,r:0.01,h:0.05,t:0,p:0.1}],
      [{w:"n0",f:33,v:0.3,d:0.2,p:0.9,t:0,}],
      [{w:"n0",f:300,v:0.3,d:0.14,p:0.9,t:0,}],
/*60*/[{w:"sine",f:200,d:0.06,t:0,}],
      [{w:"sine",f:150,d:0.06,t:0,}],
      [{w:"sine",f:300,t:0,}],
      [{w:"sine",f:300,d:0.06,t:0,}],
      [{w:"sine",f:250,d:0.06,t:0,}],
/*65*/[{w:"square",f:300,v:.3,d:.06,p:.8,t:0,}],
      [{w:"square",f:260,v:.3,d:.06,p:.8,t:0,}],
      [{w:"sine",f:850,v:.5,d:.07,t:0,}],
      [{w:"sine",f:790,v:.5,d:.07,t:0,}],
      [{w:"n0",f:440,v:0.3,a:0.05,t:0,}],
/*70*/[{w:"n0",f:440,v:0.3,a:0.05,t:0,}],
      [{w:"triangle",f:1800,v:0.4,p:0.9,t:0,h:0.03,}],
      [{w:"triangle",f:1800,v:0.3,p:0.9,t:0,h:0.13,}],
      [{w:"n0",f:330,v:0.3,a:0.02,t:0,r:0.01,}],
      [{w:"n0",f:330,v:0.3,a:0.02,t:0,h:0.04,r:0.01,}],
/*75*/[{w:"n0",f:440,v:0.3,t:0,}],
      [{w:"sine",f:800,t:0,}],
      [{w:"sine",f:700,t:0,}],
      [{w:"n0",f:330,v:0.3,t:0,}],
      [{w:"n0",f:330,v:0.3,t:0,h:0.1,r:0.01,p:0.7,}],
/*80*/[{w:"sine",t:0,f:1200,v:0.3,r:0.01,}],
      [{w:"sine",t:0,f:1200,v:0.3,d:0.2,r:0.2,}],

    ],
    ready:function(){
      var i;
      this.pg=[]; this.vol=[]; this.ex=[]; this.bend=[]; this.rpnidx=[]; this.brange=[];
      this.sustain=[]; this.notetab=[]; this.rhythm=[];
      this.soundfontPath = ""; this.soundfontBinaries = { }; this.soundfontBuffers = { };
      this.soundfontFilePrefix = "";   // determined on first instrument load: SF for MP3 soundfonts or SFOGG for OGG ones.  OGG ones are better, and in fact, MP3 ones only exist for Safari's benefit.
      this.inputList = []; this.outputList = [ ]; this.MIDIAccess = null; this.MIDIEnabled = false;
      this.inputHash = { }; this.outputHash = { }; this.onmidimessage = null;
      this.input = [null]; this.output = [null]; this.passThruMIDI = true;  // default: on all inputs we have attached, we pass through MIDI signals to the current output.
      //--- DW new feature: Auto-Gain.  Some instrument samples are really quiet, and some phones are quiet, and some places are noisy.
      //--- With Auto-Gain, you can multiply the samples out to a louder set-point to hear them better.
      //--- All auto-gain parameters are public (autoGainMaxes is automatically calculated though), and you can alter them as you wish.
      //--- I set Auto-Gain to on for all instruments, and didn't fill in an instrument list for level 1, because I found out the artifacts I heard were from MP3 samples, not AutoGain.  Now I have OGG samples again and it works great!  I guess audio compression quality DOES matter!
      this.autoGainLevel = 2;   // Levels are: 0, no auto-gain; 1, only on instruments I selected as needing it most; 2, on all instruments.
      this.autoGainSetTo = 0.7;  // what we set the amplitude to in autoGain
      this.autoGainIgnoreAbove = 0.5;   // we leave samples alone if their maximum is above this (during AutoGain)
      this.autoGainInstruments = [ ];
      this.autoGainMaxes = { };  // maximums for all samples so we can turn auto gain or off at any time
      this.selectedInputs = [ "internal" ]; this.selectedOutputs = ["internal"];
      this.availableQualities = [true,true,false];   // array of 0-2 indicating which qualities are available.  You have to load at least one instrument successfully, then Quality 2 turns on.  Quality 0/1 turn off for Internet Explorer since it can ONLY do samples.
      this.maxTick=0, this.playTick=0, this.playing=0; this.releaseRatio=3.5;
      this.programOverride = { };   // here we store custom overrides and redirects for particular instruments.  they can redirect to external devices OR custom instrument modules like the drawbar organ one above
      for(var i=0;i<16;++i){
        this.pg[i]=0; this.vol[i]=3*100*100/(127*127);
        this.bend[i]=0; this.brange[i]=0x100;
        this.rhythm[i]=0;
      }
      this.rhythm[9]=1;
      /**/
      this.preroll=0.2;
      this.relcnt=0;
      setInterval(
        function(){
          if(++this.relcnt>=3){
            this.relcnt=0;
            for(var i=this.notetab.length-1;i>=0;--i){
              var nt=this.notetab[i];
              if(this.actx.currentTime>nt.e){
                this._pruneNote(nt);
                this.notetab.splice(i,1);
                }
            }
            /**/
          }
          if(this.playing && this.song.ev.length>0){
            var e=this.song.ev[this.playIndex];
            while(this.actx.currentTime+this.preroll>this.playTime){
              if(e.m[0]==0xff51){
                this.song.tempo=e.m[1];
                this.tick2Time=4*60/this.song.tempo/this.song.timebase;
              }
              else
                this.send(e.m,this.playTime);   // NOTE: we use public Send, so we can play the midi file on any inputs or outputs!
              ++this.playIndex;
              if(this.playIndex>=this.song.ev.length){
                if(this.loop){
                  e=this.song.ev[this.playIndex=0];
                  this.playTick=e.t;
                }
                else{
                  this.playTick=this.maxTick;
                  this.playing=0;
                  break;
                }
              }
              else{
                e=this.song.ev[this.playIndex];
                this.playTime+=(e.t-this.playTick)*this.tick2Time;
                this.playTick=e.t;
              }
            }
          }
        }.bind(this),60
      );
      //console.log("internalcontext:"+this.internalcontext)
      if(this.internalcontext){
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext)
          this.setAudioContext(new AudioContext());
        else
          this.setAudioContext(null);
      }
      this.isReady=1;
    },
    /**/  // new from DW: custom override instruments!
    setProgramOverride:function(progNum, obj) {
      // Set Program Override.  The progNum is an instrument number, 0-127.  The
      // object can be null to revert back to the regular program based on quality level;
      // it can also be an array of two-element arrays, where the first element is either a string indicating
      // which MIDI port to output to for this instrument, or an object which is an internal
      // custom synth object with a particular interface (the drawbar organ at the top of this file
      // is an example-- you need a send method, a connect method, etc.).  The second element of the
      // array is the channel to redirect to.  Note that you provide an array of these objects, so
      // a single instrument can be redirected to multiple outside devices!
      this.programOverride[progNum] = obj;
    },
    /**/
    instrumentsInSong:function() {    // new from DW: read all the events in the loaded song, find out what instruments are in it so we can load them (Quality Level 2, sampled sounds).
      var iis = [ ];                  // can be passed directly to loadInstruments.  Only includes ones that aren't already loaded.
      if (this.song && this.song.ev && this.song.ev.length) {
        for (var i = 0; i < this.song.ev.length; i++) {
          if ((this.song.ev[i].m[0] & 0xF0) === 0xC0) {
            var newinst = this.song.ev[i].m[1] & 0x7F;
            if (iis.indexOf(newinst)===-1 && (!this.soundfontBuffers.hasOwnProperty(newinst))) 
              iis.push(newinst);
            var channel = this.song.ev[i].m[0] & 0x0F;
            if (channel===9 && iis.indexOf(128)===-1 && (!this.soundfontBuffers.hasOwnProperty(128)))
              iis.push(128);    // don't forget to add the drum instrument if anything plays on the drum channel!
          }
        }
      }
      return iis;
    },
    setSoundfontPath:function(path) {			// new from DW: set soundfont path
	    this.soundfontPath = path;
    },
    _arrayBufferToBase64: function ( bytes ) {  // only needed for IE to save samples in base64 for use by Audio nodes
      var binary = '';  // bytes should be a Uint8Array
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
          binary += String.fromCharCode( bytes[ i ] );
      }
      return window.btoa( binary );
    },
    getSampleMax:function(sample) {
      //-- Used for auto-gain: Gets the maximum amplitude of a sample buffer.
      var nch = sample.numberOfChannels;  // do it in stereo!
      var maxAbsValue = 0; var dabs = 0; var chlen = 0 | 0; var chdata = null; var i = 0 | 0; var ch = 0 | 0;
      for (ch = 0; ch < nch; ch++) {
        chdata = sample.getChannelData(ch);  // now we have the data!
        chlen = chdata.length | 0;  // i'm adding the |0's like in asm.js, to cast the loop index to integer, to make it faster??!!
        for (i = 0|0; i < chlen; i++) {
          dabs = Math.abs(chdata[i]);
          if (dabs > maxAbsValue) maxAbsValue = dabs;
        }
      }
      return maxAbsValue;
    },
    expandInstrument:function(instNum, callbackErr, callbackSuccess) {  // new from DW: (asynchronously) expand a binary soundfont file's notes into its corresponding AudioBuffers for playback.
      var buf = this.soundfontBinaries[instNum];  // to get this you have to loadInstrument, which automatically calls expandInstrument.
      var dv = new DataView(buf);   // DataView so we can force little-enian reading of file, just like how I created it
      var bv = new Uint8Array(buf);  // byte view is cool too
      this.soundfontBuffers[instNum] = { };   // each instrument has a hash of soundfont buffers by note #.
      var bindx = 0; var mysynth = this;
      if (!(bv[0] === 0x31 && bv[1] === 0x42 && bv[2] === 0x53 && bv[3] === 0x46)) { if (callbackErr) callbackErr("Soundfont decoding error -- signature missing"); return; }
      bindx += 4;
      var asyncRecurseExpand = function(bindx, synth, callbackErr, callbackSuccess, bv, dv, instNum) {
        var noteNum = dv.getInt32(bindx,true);
        var lengthWords = dv.getInt32(bindx+4,true);
        var lengthBytes = dv.getInt32(bindx+8,true);
        if (noteNum===0 && lengthWords ===0 && lengthBytes==0) {
          delete synth.soundfontBinaries[instNum];
          if (callbackSuccess) callbackSuccess(); // we're at the end
          return;
        }
        var noteBuffer;
        if (!bv.slice) {    // IE
          noteBuffer = new Uint8Array(lengthBytes);
          for (var j = 0; j < lengthBytes; j++) noteBuffer[j] = bv[bindx+12+j];  //ooh, slow!
        }
        else 
          noteBuffer = bv.slice(bindx+12,bindx+12+lengthBytes);  // this is the original MP3 file of the note's sound
        bindx += 12 + (lengthWords<<2);
        if (synth.actx.decodeAudioData) {
          synth.actx.decodeAudioData(noteBuffer.buffer, function(finishedBuffer) {
            var maxAmp = synth.getSampleMax(finishedBuffer);
            if (!synth.soundfontBuffers.hasOwnProperty(instNum)) synth.soundfontBuffers[instNum] = { };
            if (!synth.autoGainMaxes.hasOwnProperty(instNum)) synth.autoGainMaxes[instNum] = { };
            synth.soundfontBuffers[instNum][noteNum] = finishedBuffer;
            synth.autoGainMaxes[instNum][noteNum] = maxAmp;
            asyncRecurseExpand(bindx,synth,callbackErr,callbackSuccess,bv,dv,instNum);
          }, function() { if (callbackErr) callbackErr("Soundfont file for note " + noteNum + " could not be decoded"); });
        } else {    // IE: no decode audio data.  But that's okay because the audio DOM node needs MP3 anyway!
          var dataURI = "data:audio/mp3;base64," + synth._arrayBufferToBase64(noteBuffer);
          if (!synth.soundfontBuffers.hasOwnProperty(instNum)) synth.soundfontBuffers[instNum] = { };
          var a = document.createElement("audio");
          a.src = dataURI; a.preload = true;
          synth.soundfontBuffers[instNum][noteNum] = a;   // we store the tag, not the data, to reduce latency.
          setTimeout(function() { 
            asyncRecurseExpand(bindx,synth,callbackErr,callbackSuccess,bv,dv,instNum); }, 5);
        }
      };
      asyncRecurseExpand(bindx, mysynth, callbackErr, callbackSuccess, bv, dv, instNum);
    },
    loadInstrument:function(instNum, callbackErr, callbackSuccess) {	// new from DW: load instrument; asynchronous; callbacks on complete
      if (this.soundfontBuffers.hasOwnProperty(instNum)) { if (callbackSuccess) callbackSuccess(); return; }  // success: it's already loaded!
      //-- if needed, determine the file prefix
      if (this.soundfontFilePrefix==="") {
        var mp3Prefix = "SF"; var oggPrefix = "SFOGG";
        if (typeof(window.Audio)==="undefined") this.soundfontFilePrefix = mp3Prefix;
        else {
          var audio = new window.Audio();
          if (typeof(audio.canPlayType)==='undefined') this.soundfontFilePrefix = mp3Prefix;
          else {
            var vorbis = audio.canPlayType('audio/ogg; codecs="vorbis"');
            vorbis = (vorbis === 'probably' || vorbis === 'maybe');
            if (window.navigator.userAgent.indexOf('Edge/') >= 0) vorbis = false;  // Edge thinks it can read Ogg, and it does, but REALLY SLOWLY. 
            if (vorbis) this.soundfontFilePrefix = oggPrefix;
            else this.soundfontFilePrefix = mp3Prefix;
          }
        }
      }
      //-- now get the file
      var filename = this.soundfontPath + "/" + this.soundfontFilePrefix + "_" + (instNum+1) + ".BIN";   // we will get this file via XHR
      var xhr=new XMLHttpRequest(); var errParm = { "xhr" : xhr, "errMsg" : "Soundfont not found or network error" };  // default error return
      xhr.open("GET",filename,true);   //-- Note that if the soundfont is not found, the player's default is to use its lovely FM-synthesized Quality 1 sounds.
      xhr.responseType="arraybuffer"; var that = this;
      xhr.onerror = function() { if (callbackErr) callbackErr(errParm); }
      xhr.onload=function(e){
      if(this.status>=200 && this.status <= 299){
        that.soundfontBinaries[instNum] = this.response; var buf = this.response;  // now we have the binary-- read it
        that.expandInstrument(instNum, function(obj) {
          errParm = "Soundfont decoding error"; if (callbackErr) callbackErr();
        }, function() {
          that.availableQualities[2] = true;
          if (callbackSuccess) callbackSuccess();
        });
      } else { if (callbackErr) callbackErr(errParm); }
      };
      xhr.send();
    },
    loadInstruments: function(instNumArray, callbackErr, callbackSuccess, callbackProgress) {   // loads more than one instrument, calling success only after all are loaded (asynchronous)
      var i = 0; var mysynth = this;
      var asyncRecurse = function(indx, synth, instNumArray, callbackErr, callbackSuccess, callbackProgress) {
        if (indx >= instNumArray.length) { if (callbackSuccess) callbackSuccess(); return; }  // all done
        if (callbackProgress) callbackProgress(indx+1, instNumArray.length);
        synth.loadInstrument(instNumArray[indx], callbackErr, function() {
          asyncRecurse((indx+1),synth,instNumArray,callbackErr,callbackSuccess, callbackProgress);
        });
      };
      asyncRecurse(i, mysynth, instNumArray, callbackErr, callbackSuccess, callbackProgress);
    },
    /**/
    setMasterVol:function(v){
      if(v!=undefined)
        this.masterVol=v;
      if(this.out)
        this.out.gain.value=this.masterVol;
    },
    setReverbLev:function(v){
      if(v!=undefined)
        this.reverbLev=v;
      var r=parseFloat(this.reverbLev);
      if(this.rev&&!isNaN(r))
        this.rev.gain.value=r*8;
    },
    setLoop:function(f){
      this.loop=f;
    },
    setVoices:function(v){
      this.voices=v;
    },
    getPlayStatus:function(){
      return {play:this.playing, maxTick:this.maxTick, curTick:this.playTick};
    },
    locateMIDI:function(tick){
      var i,p=this.playing;
      this.stopMIDI();
      for(i=0;i<this.song.ev.length && tick>this.song.ev[i].t;++i){
        var m=this.song.ev[i];
        var ch=m.m[0]&0xf;
        switch(m.m[0]&0xf0){
        case 0xb0:
          switch(m.m[1]){
          case 1:  this.setModulation(ch,m.m[2]); break;
          case 7:  this.setChVol(ch,m.m[2]); break;
          case 10: this.setPan(ch,m.m[2]); break;
          case 11: this.setExpression(ch,m.m[2]); break;
          case 64: this.setSustain(ch,m.m[2]); break;
          }
          break;
        case 0xc0: this.pg[m.m[0]&0x0f]=m.m[1]; break;
        }
        if(m.m[0]==0xff51)
          this.song.tempo=m.m[1];
      }
      if(!this.song.ev[i]){
        this.playIndex=0;
        this.playTick=this.maxTick;
      }
      else{
        this.playIndex=i;
        this.playTick=this.song.ev[i].t;
      }
      if(p)
        this.playMIDI();
    },
    getTimbreName:function(m,n){
      try {
        if(m==0)
          return this.program[n].name;
        else
          return this.drummap[n-35].name;
      } catch(e) { return ""; }
    },
    loadMIDIUrl:function(url){
      if(!url)
        return;
      var xhr=new XMLHttpRequest();
      xhr.open("GET",url,true);
      xhr.responseType="arraybuffer";
      xhr.loadMIDI=this.loadMIDI.bind(this);
      xhr.onload=function(e){
        if(this.status==200){
          this.loadMIDI(this.response);
        }
      };
      xhr.send();
    },
    reset:function(){
      for(var i=0;i<16;++i){
        this.setProgram(i,0);
        this.setBendRange(i,0x100);
        this.setChVol(i,100);
        this.setPan(i,64);
        this.resetAllControllers(i);
        this.allSoundOff(i);
        this.rhythm[i]=0;
      }
      this.rhythm[9]=1;
    },
    stopMIDI:function(){
      this.playing=0;
      for(var i=0;i<16;++i)
        this.allSoundOffAllDevices(i);
    },  /* actx.currentTime+this.preroll+0.1 */
    playMIDI:function() {     // new from DW: external wrapper version of playMIDI that auto-loads instruments before starting to play.
      if (!this.song) return;
      if (this.quality < 2) return this._playMIDI();    // non-sampled sounds work the same as before
      var neededInstruments = this.instrumentsInSong(); var that = this;
      if (neededInstruments.length===0 || (!this.hasInternalOutput())) return this._playMIDI();  // if no instruments needed, start the usual way
      this.loadInstruments(neededInstruments, function() {
        that.setQuality(1);
        that._playMIDI();  // on error loading instruments, revert to quality level 1.
      }, function() {
        //-- on success loading them, we play!  the delay until they are loaded ensures a smooth song. to prevent delay, you can load them yourself manually first.
        that._playMIDI();
      });
    },
    _playMIDI:function(){     // DW change: now internal version.  See external version with auto loading of instruments, above.
      if(!this.song)
        return;
      if (!this.useAudioTags()) {
        var dummy=this.actx.createOscillator();
        dummy.connect(this.actx.destination);
        dummy.frequency.value=0;
        dummy.start(0);
        dummy.stop(this.actx.currentTime+0.001);
      }
      if(this.playTick>=this.maxTick)
        this.playTick=0,this.playIndex=0;
      this.playTime=this.actx.currentTime+.1;
      this.tick2Time=4*60/this.song.tempo/this.song.timebase;
      this.playing=1;
    },
    loadMIDI:function(data){
      function Get2(s, i) { return (s[i]<<8) + s[i+1]; }
      function Get3(s, i) { return (s[i]<<16) + (s[i+1]<<8) + s[i+2]; }
      function Get4(s, i) { return (s[i]<<24) + (s[i+1]<<16) + (s[i+2]<<8) + s[i+3]; }
      function GetStr(s, i, len) {
        if (!s.slice) {   // darn IE
          var s= "";
          for (var k = i; k < i+len; k++) s += String.fromCharCode(s[k]);
          return s;
        }
        return String.fromCharCode.apply(null,s.slice(i,i+len));
      }
      function Delta(s, i) {
        var v, d;
        v = 0;
        datalen = 1;
        while((d = s[i]) & 0x80) {
          v = (v<<7) + (d&0x7f);
          ++datalen;
          ++i;
        }
        return (v<<7)+d;
      }
      function Msg(song,tick,s,i){
        var v=s[i];
        datalen=1;
        if((v&0x80)==0)
          v=runst,datalen=0;
        runst=v;
        switch(v&0xf0){
        case 0xc0: case 0xd0:
          song.ev.push({t:tick,m:[v,s[i+datalen]]});
          datalen+=1;
          break;
        case 0xf0:
          switch(v) {
          case 0xf0:
          case 0xf7:
            var len=Delta(s,i+1);
            datastart=1+datalen;
            var exd=Array.from(s.slice(i+datastart,i+datastart+len));
            exd.unshift(0xf0);
            song.ev.push({t:tick,m:exd});
/*
            var sysex=[];
            for(var jj=0;jj<len;++jj)
              sysex.push(s[i+datastart+jj].toString(16));
            console.log(sysex);
*/
            datalen+=len+1;
            break;
          case 0xff:
            var len = Delta(s, i + 2);
            datastart = 2+datalen;
            datalen = len+datalen+2;
            switch(s[i+1]) {
            case 0x02: song.copyright+=GetStr(s, i + datastart, datalen - 3); break;
            case 0x01: case 0x03: case 0x04: case 0x09:
              song.text=GetStr(s, i + datastart, datalen - datastart);
              break;
            case 0x2f:
              return 1;
            case 0x51:
              var val = Math.floor(60000000 / Get3(s, i + 3));
              song.ev.push({t:tick, m:[0xff51, val]});
              break;
            }
            break;
          }
          break;
        default:
          song.ev.push({t:tick,m:[v,s[i+datalen],s[i+datalen+1]]});
          datalen+=2;
        }
        return 0;
      }
      this.stopMIDI();
      var s=new Uint8Array(data);
      var datalen = 0, datastart = 0, runst = 0x90;
      var idx = 0;
      var hd = s.slice ? s.slice(0,  4): [77,84,104,100];
      if (!(s[0]===77 && s[1]===84 && s[2]===104 && s[3]===100))
        return;
      var len = Get4(s, 4);
      var fmt = Get2(s, 8);
      var numtrk = Get2(s, 10);
      this.maxTick=0;
      var tb = Get2(s, 12)*4;
      idx = (len + 8);
      this.song={copyright:"",text:"",tempo:120,timebase:tb,ev:[]};
      for(var tr=0;tr<numtrk;++tr){
        hd=s.slice? s.slice(idx, idx+4) : [77,84,114,107];
        len=Get4(s, idx+4);
        if((s[idx]===77 && s[idx+1]===84 && s[idx+2]===114 && s[idx+3]===107)) { //MTrk
          var tick = 0;
          var j = 0;
          this.notetab.length = 0;
          for(;;) {
            tick += Delta(s, idx + 8 + j);
            j += datalen;
            var e = Msg(this.song, tick, s, idx + 8 + j);
            j += datalen;
            if(e)
              break;
          }
          if(tick>this.maxTick)
            this.maxTick=tick;
        }
        idx += (len+8);
      }
      this.song.ev.sort(function(x,y){return x.t-y.t});
      this.reset();
      this.locateMIDI(0);
    },
    setQuality:function(q){
      var i,k,n,p;    // DW warning: If you set quality to 2 (Sampled Sounds), you are responsible for loading instruments, otherwise quality falls back to level 1 until they are loaded (which happens automatically only on program changes).
      if(q!=undefined)
        this.quality=q;
      if (q===2) { q=1;  }  // DW changes: Quality 2, sampled sounds.  They use the timbre array for Quality 1, which they fall back to if the sample is missing.
      for(i=0;i<128;++i)
        this.setTimbre(0,i,this.program0[i]);
      for(i=0;i<this.drummap0.length;++i)
        this.setTimbre(1,i+35,this.drummap0[i]);
      if(this.quality){
        for(i=0;i<this.program1.length;++i)
          this.setTimbre(0,i,this.program1[i]);
        for(i=0;i<this.drummap.length;++i){
          if(this.drummap1[i])
            this.setTimbre(1,i+35,this.drummap1[i]);
        }
      }
    },
    setTimbre:function(m,n,p){
      var defp={g:0,w:"sine",t:1,f:0,v:0.5,a:0,h:0.01,d:0.01,s:0,r:0.05,p:1,q:1,k:0};
      function filldef(p){
        for(n=0;n<p.length;++n){
          for(k in defp){
            if(!p[n].hasOwnProperty(k) || typeof(p[n][k])=="undefined")
              p[n][k]=defp[k];
          }
        }
        return p;
      }
      if(m && n>=35 && n<=81)
        this.drummap[n-35].p=filldef(p);
      if(m==0 && n>=0 && n<=127)
        this.program[n].p=filldef(p);
    },
    _pruneNote:function(nt){
      for(var k=nt.o.length-1;k>=0;--k){
        if(nt.o[k].frequency)
          this.chmod[nt.ch].disconnect(nt.o[k].detune);
        nt.o[k].disconnect();
        if(nt.o[k].frequency)
          nt.o[k].frequency.cancelScheduledValues(0);
        else
          nt.o[k].playbackRate.cancelScheduledValues(0);
        nt.o[k].stop(0);
      }
      for(var k=nt.g.length-1;k>=0;--k){
        nt.g[k].disconnect();
        nt.g[k].gain.cancelScheduledValues(0);
      }
    },
    _limitVoices:function(ch,n){
      this.notetab.sort(function(n1,n2){
        if(n1.f!=n2.f) return n1.f-n2.f;
        if(n1.e!=n2.e) return n2.e-n1.e;
        return n2.t-n1.t;
      });
      for(var i=this.notetab.length-1;i>=0;--i){
        var nt=this.notetab[i];
        if(this.actx.currentTime>nt.e || i>=(this.voices-1)){
          this._pruneNote(nt);
          this.notetab.splice(i,1);
        }
      }
    },
    useAudioTags:function() { if (!this.actx.createOscillator) return true; else return false; },
    getNextPositiveZeroCrossing:function(sample,t) {   // looks at the sample data, finds the next time after t (in seconds) where there is a zero crossing going up.
      //-- purpose: loop samples without clicks?!
      var dt = sample.getChannelData(0);  var dt2 = null;
      if (sample.numberOfChannels == 2) dt2 = sample.getChannelData(1); else dt2 = dt;
      var ti = (t * sample.sampleRate)|0; var dtlen = dt.length|0;  // get index into array
      var endi = dtlen - 1;
      if ((t+0.25)*sample.sampleRate < endi) endi = ((t+0.25)*sample.sampleRate)|0;  // only search a quarter of a second -- don't get too far off the original time
      for (var i = ti; i < endi; i++) {
        if (dt[i]+dt2[i] < 0 && dt[i+1]+dt2[i+1] >= 0) {    // i+1 is the one!
          return (i+1)/sample.sampleRate;
        }
      }
      return t;   // if for some reason we can't find one, just return the original timestamp.
    },
    _note:function(t,ch,n,v,p){   
      // Modified by DW to use Audio tags on archaic browsers like IE.
      if (this.useAudioTags()) {    // IE version-- we made a fake audio context with a timer, but it has no oscillator
        var thisInst = this.pg[ch]; if (ch===9) thisInst = 128;  // drum channel sample is always instrument #128
        var sample = "";
        if (this.soundfontBuffers.hasOwnProperty(thisInst) &&
          this.soundfontBuffers[thisInst].hasOwnProperty(n)) {
            sample = this.soundfontBuffers[thisInst][n];
          }
        if (!sample) return;   // on IE, no soundfonts mean no sound, there's no synthesizer backup.
        var a = sample;
        try { a.currentTime = 0;} catch(e) { }
        try { a.volume = this.masterVol * this.vol[ch] * (v/127);  } catch(e) { }  // yes, we do have velocity control, thank you!
        if (!this.rhythm[ch])    
          this.notetab.push({t:t,e:99999999,ch:ch,n:n,o:[],g:[],t2:t,v:0,r:[p[0].r],f:0,activeQuality:2,useAudioTags:true,audioTag:a});
        if (t-this.actx.currentTime > 0.01)
          setTimeout(function() { a.play(); },t-this.actx.currentTime);
        else
          a.play();
        return;
      }
      // Modified by DW to allow playing of sampled notes at quality level 2.  If note or instrument is not downloaded by now, we just fallback to Quality Level 1.
      // (Higher-levels auto-load instruments: program changes do them without stopping playing, and playing a MIDI file loads them before starting).
      var o=[],g=[],vp=[],fp=[],r=[],i,out,sc,pn,activeQuality=this.quality;
      var f=440*Math.pow(2,(n-69)/12);
      this._limitVoices(ch,n);
      // quality 2: get sample if available, fall back to lower quality if not (DW)
      var activeQuality = this.quality; var sample = null;
      var thisInst = this.pg[ch]; if (ch===9) thisInst = 128;  // drum channel sample is always instrument #128
      if (activeQuality===2) {
        if (this.soundfontBuffers.hasOwnProperty(thisInst) &&
          this.soundfontBuffers[thisInst].hasOwnProperty(n)) {
            sample = this.soundfontBuffers[thisInst][n];
          }
          else activeQuality = 1;  // fallback to quality 1 if no sample
      }
      this.activeQuality = activeQuality;
      // now regular note code
      for(i=0;i<p.length;++i){
        if (activeQuality===2 && i > 0) break;  // skip lines past the first when sampling
        if (activeQuality===2) {
          // sampling version
          pn=p[0];
          out = this.chvol[ch], sc=v*v/16384, fp[i]=f;
          if (this.autoGainLevel > 0) {    // We multiply the gain if auto-gain is on.
            if (this.autoGainLevel >=2 || this.autoGainInstruments.indexOf(thisInst) >= 0) {
              var sampMax = this.autoGainMaxes[thisInst][n];
              if (sampMax <= this.autoGainIgnoreAbove) {
                var thisMax = sampMax; var factor = 1;  // we compute a factor that is a power of 2 to multiply by, for cleaner adjustment.
                while (thisMax*factor*2 < this.autoGainSetTo) { factor *= 2; thisMax *= 2; }
                sc *= factor;
              }
            }
          }
          o[i]=this.actx.createBufferSource(); o[i].buffer = sample; var endRampDown = false;
          if (!this.rhythm[ch] && p[0].s>=0.39) { 
            o[i].loop = true; 
            o[i].loopStart = this.getNextPositiveZeroCrossing(sample,0.8); 
            o[i].loopEnd = this.getNextPositiveZeroCrossing(sample, sample.duration - 0.1); 
          }     // loop the sample if this is a sustained sound (and not percussion-- let's assume no percussion is sustained!)-- works pretty good!
          else 
            endRampDown = true;  // also, we always ramp down at the end of the sample
          this.chmod[ch].connect(o[i].detune);  // mod wheel
          if (o[i].detune) o[i].detune.value=this.bend[ch];    // pitch bend
          g[i]=this.actx.createGain();
          r[i]=pn.r;    // we do keep the release time from Quality 1 line 0-- the combination will make my bells ring more ringily! :-) DW
          o[i].connect(g[i]); g[i].connect(out);
          vp[i]=sc;
          g[i].gain.setValueAtTime(vp[i],t);  // no attack time
          if (endRampDown) {  // if determined to be needed above, we have a soft decay right before the sample runs out to avoid clicks
            g[i].gain.setValueAtTime(vp[i],t+sample.duration-0.10);
            g[i].gain.linearRampToValueAtTime(0,t+sample.duration-0.01);
          }
          o[i].start(t);    // end of sample version by DW
        } else {    // regular synthesis version
          pn=p[i];
          var dt=t+pn.a+pn.h;
          if(pn.g==0)
            out=this.chvol[ch], sc=v*v/16384, fp[i]=f*pn.t+pn.f;
          else if(pn.g>10)
            out=g[pn.g-11].gain, sc=1, fp[i]=fp[pn.g-11]*pn.t+pn.f;
          else if(o[pn.g-1].frequency)
            out=o[pn.g-1].frequency, sc=fp[pn.g-1], fp[i]=fp[pn.g-1]*pn.t+pn.f;
          else
            out=o[pn.g-1].playbackRate, sc=fp[pn.g-1]/440, fp[i]=fp[pn.g-1]*pn.t+pn.f;
          switch(pn.w[0]){
          case "n":
            o[i]=this.actx.createBufferSource();
            o[i].buffer=this.noiseBuf[pn.w];
            o[i].loop=true;
            o[i].playbackRate.value=fp[i]/440;
            if(pn.p!=1)
              this._setParamTarget(o[i].playbackRate,fp[i]/440*pn.p,t,pn.q);
            break;
          default:
            o[i]=this.actx.createOscillator();
            o[i].frequency.value=fp[i];
            if(pn.p!=1)
              this._setParamTarget(o[i].frequency,fp[i]*pn.p,t,pn.q);
            if(pn.w[0]=="w")
              o[i].setPeriodicWave(this.wave[pn.w]);
            else
              o[i].type=pn.w;
            this.chmod[ch].connect(o[i].detune);
            if (o[i].detune) o[i].detune.value=this.bend[ch];
            break;
          }
          g[i]=this.actx.createGain();
          r[i]=pn.r;
          o[i].connect(g[i]); g[i].connect(out);
          vp[i]=sc*pn.v;
          if(pn.k)
            vp[i]*=Math.pow(2,(n-60)/12*pn.k);
          if(pn.a){
            g[i].gain.value=0;
            g[i].gain.setValueAtTime(0,t);
            g[i].gain.linearRampToValueAtTime(vp[i],t+pn.a);
          }
          else
            g[i].gain.setValueAtTime(vp[i],t);
          this._setParamTarget(g[i].gain,pn.s*vp[i],dt,pn.d);
          o[i].start(t);
          if(this.rhythm[ch])
            o[i].stop(t+p[0].d*this.releaseRatio);
        }
      }
      // Oh!  Drumbeats are not added to the note array so they turn off by themselves (& play to the end!  It's true, releasing the drum sound before it's done sounds dumb.)
      if (!this.rhythm[ch])    
        this.notetab.push({t:t,e:99999999,ch:ch,n:n,o:o,g:g,t2:t+pn.a,v:vp,r:r,f:0,activeQuality:activeQuality});
    },
    _setParamTarget:function(p,v,t,d){
      if(d!=0)
        p.setTargetAtTime(v,t,d);
      else
        p.setValueAtTime(v,t);
    },
    _releaseNote:function(nt,t){
      if(this.useAudioTags()) {   // IE version
        //-- In IE, if there is a release, we just leave the note on until the release time is finished.
        nt.e = t+nt.r[0]*this.releaseRatio*2+0.015;  // the *2+0.015 extends the release to cover for IE's timing lag
        nt.f=1;
        if (nt.e - this.actx.currentTime > 0.010) {
          if (nt.e - this.actx.currentTime > 0.2) {
            // for long releases we put a reduction of volume halfway through
            setTimeout(function() { try {
              nt.audioTag.volume /= 2;
            } catch(e) { } }, (nt.e + this.actx.currentTime)/2)
          }
          setTimeout(function() { try {
              nt.audioTag.volume = 0;
          } catch(e) { } }, nt.e - this.actx.currentTime);
        } else
          { try { 
            nt.audioTag.volume = 0; 
          } catch(e) { } 
        }
        return;
      }
      if(nt.ch!=9 || nt.activeQuality===2){   // DW change: always do this code for samples, even drum samples.
        for(var k=nt.g.length-1;k>=0;--k){
          nt.g[k].gain.cancelScheduledValues(t);
          if(t==nt.t2)
            nt.g[k].gain.setValueAtTime(nt.v[k],t);
          else if(t<nt.t2)
            nt.g[k].gain.setValueAtTime(nt.v[k]*(t-nt.t)/(nt.t2-nt.t),t);
          this._setParamTarget(nt.g[k].gain,0,t,nt.r[k]);
        }
      }
      nt.e=t+nt.r[0]*this.releaseRatio;
      nt.f=1;
    },
    setModulation:function(ch,v,t){
      if (this.useAudioTags()) return;
      this.chmod[ch].gain.setValueAtTime(v*100/127,this._tsConv(t));
    },
    setChVol:function(ch,v,t){
      this.vol[ch]=3*v*v/(127*127);
      if (this.useAudioTags()) return;  // skip the gain part for Internet Explorer
      this.chvol[ch].gain.setValueAtTime(this.vol[ch]*this.ex[ch],this._tsConv(t));
    },
    setPan:function(ch,v,t){
      if (this.useAudioTags()) return;
      if(this.chpan[ch])
        this.chpan[ch].pan.setValueAtTime((v-64)/64,this._tsConv(t));
    },
    setExpression:function(ch,v,t){
      this.ex[ch]=v*v/(127*127);
      if (this.useAudioTags()) return;
      this.chvol[ch].gain.setValueAtTime(this.vol[ch]*this.ex[ch],this._tsConv(t));
    },
    setSustain:function(ch,v,t){    // note: I think sustain will work on IE (with no changes?!)
      this.sustain[ch]=v;
      t=this._tsConv(t);
      if(v<64){
        for(var i=this.notetab.length-1;i>=0;--i){
          var nt=this.notetab[i];
          if(t>=nt.t && nt.ch==ch && nt.f==1)
            this._releaseNote(nt,t);
        }
      }
    },
    allSoundOff:function(ch){
      for(var i=this.notetab.length-1;i>=0;--i){
        var nt=this.notetab[i];
        if(nt.ch===ch){
          this._pruneNote(nt);
          this.notetab.splice(i,1);
        }
      }
    },
    allSoundOffAllDevices:function(ch) {  // unlike all sound off, this also sends messages to all current output devices.
      this.send([0xb0+(ch & 0x0F),120,0])  // MIDI message to all outputs: all sound off.
    },
    allSoundOffAllDevicesAllChannels:function() {
      for (var i = 0; i < 16; i++) this.allSoundOffAllDevices(i);
    },
    MIDIPanic:function() { this.allSoundOffAllDevicesAllChannels(); },   // shorter name, same concept
    resetAllControllers:function(ch){
      this.bend[ch]=0; this.ex[ch]=1.0;
      this.rpnidx[ch]=0x3fff; this.sustain[ch]=0;
      if(this.chvol[ch]){
        this.chvol[ch].gain.value=this.vol[ch]*this.ex[ch];
        this.chmod[ch].gain.value=0;
      }
    },
    setBendRange:function(ch,v){
      this.brange[ch]=v;
    },
    _disconnectCustomInstruments:function(ch,v) {    // disconnects any custom instruments attached to ch that are associated with patch v.
      try {
        if (this.programOverride[v]) {
          for (var i = 0; i < this.programOverride[v].length; i++) {
            var o = this.programOverride[v][i][0];
            if ((typeof o) !== 'string') {
              try { o.disconnect(this.chvol[ch]); } catch(e) { }
            }
          }
        }
      } catch(e) { }
    },
    hasInternalOutput:function() {  // needed for setProgram: finds out if we currently are sending internal output.  We only auto-load instruments in that case.
        for (var i = 0; i < this.selectedOutputs.length; i++) {
            if (this.selectedOutputs[i]==="internal") return true;
        }
        return false;
    },
    setProgram:function(ch,v){
      if(this.debug)
        console.log("Pg("+ch+")="+v);
      if (ch===9) return;   // we can't change the program on drums
      this._disconnectCustomInstruments(this.pg[ch]);  // disconnect from any custom instruments that may have been attached before
      this.pg[ch]=v;    // Added by DW below: in quality level 2, load the instrument if it exists.
      if (this.quality === 2  && this.hasInternalOutput()) { this.loadInstrument(v,null,null); }   // aysnchronous call
      // during music playback, we can't stop-- notes that play before it's loaded will just fall back to quality 1.  For best playback, do like the MIDI file player does and load all your instruments first.
      if (this.programOverride[v]) {  // this instrument has an override.  see if there are any custom instruments
        //-- if there are you have to connect them to the channel volume output, so pan and vol can be controlled.
        for (var i = 0; i < this.programOverride[v].length; i++) {
          var o = this.programOverride[v][i][0];
          if ((typeof o) !== 'string') {
            if (this.chvol && this.chvol[ch]) o.connect(this.chvol[ch]);
          }
        }
      }
    },
    setBend:function(ch,v,t){
      if (this.useAudioTags()) return;
      t=this._tsConv(t);
      var br=this.brange[ch]*100/127;
      this.bend[ch]=(v-8192)*br/8192;
      for(var i=this.notetab.length-1;i>=0;--i){
        var nt=this.notetab[i];
        if(nt.ch==ch){
          for(var k=nt.o.length-1;k>=0;--k){
            if(nt.o[k].frequency || nt.activeQuality===2)
              nt.o[k].detune.setValueAtTime(this.bend[ch],t);
          }
        }
      }
    },
    noteOn:function(ch,n,v,t){
        if(v==0){
        this.noteOff(ch,n,t);
        return;
      }
      t=this._tsConv(t);
      if(this.rhythm[ch]){
        if(n>=35&&n<=81)
          this._note(t,ch,n,v,this.drummap[n-35].p);
        return;
      }
      this._note(t,ch,n,v,this.program[this.pg[ch]].p);
    },
    noteOff:function(ch,n,t){
      if(this.rhythm[ch])
        return;
      t=this._tsConv(t);
      for(var i=this.notetab.length-1;i>=0;--i){
        var nt=this.notetab[i];
        if(t>=nt.t && nt.ch==ch && nt.n==n && nt.f==0){
          nt.f=1;
          if(this.sustain[ch]<64)
            this._releaseNote(nt,t);
        }
      }
    },
    currentTime:function() { if (!this.actx) return 0; else return this.actx.currentTime; },
    _tsConv:function(t){
      if(t==undefined||t<=0){
        t=0;
        if(this.actx)
          t=this.actx.currentTime;
      }
      else{
        if(this.tsmode)
          t=t*.001-this.tsdiff;
      }
      return t;
    },
    setTsMode:function(tsmode){
      this.tsmode=tsmode;
    },
    send:function(msg,t){   /* DW new: Public version of send that sends the midi message to whichever input sources are currently configured! */
      var midi = this;
      // first check for program overrides on the current channel.
      if (msg.length < 1) return false;
      var ch = msg[0] & 0x0F; var pgm = this.pg[ch];
      if (this.programOverride[pgm]) {
        var o = this.programOverride[pgm];
        for (var i = 0; i < o.length; i++) {  // multiple overrides are allowed!
          var dch = o[i][1];
          if (dch >= 0) { msg[0] = (msg[0] & 0xF0) & (dch & 0x0F); }  // check for channel redirect
          if ((typeof o[i][0])==='string') 
            this.sendExternal(o[i][0],msg,t);   // override can be a string to go to a particular external output
          else {
             var rval = o[i][0].send(msg, t);  // try to have custom instrument handle it
             if (!rval) this._send(msg,t);  // if it won't, have the standard INTERNAL routines handle it.
           } 
        }
      }
      else
        this._sendCurrentOutput(msg,t);
    },
    _sendCurrentOutput:function(msg, t) {
      // send that does the standard thing (cycling through the currently selected general outputs)
      // that we call if any particular custom send device doesn't handle a particular message
      var midi = this;
      if (!this.MIDIEnabled) return this._send(msg,t);   // quick: if MIDI I/O not enabled, just send to internal synth.
      // default method of sending: to all currently enabled outputs, possibly including the internal synth.
      for (var i = 0; i < this.output.length; i++) {
        if (!this.output[i])    // special case: internal output.  Send using Audio Clock (regardless of t parameter)
          this._send(msg,t);
        else 
          this.sendExternal(this.output[i],msg,t);  
      }
    },
    sendExternal:function(device,msg,t) {  // Sends a MIDI message to a particular external port, which can be either a MIDI output object, OR, an ID string to locate the object.
      if ((typeof device) === 'string') {
        if (this.outputHash.hasOwnProperty(device)) device = this.outputHash[device];
        else return false;
      }
      if (t >= this.actx.currentTime + 0.010)
        this._sendExternalOnDelay(msg, device, t);
      else
        device.send(msg);
    },
    _sendExternalOnDelay:function(msg,device,t) {
      var midi = this;  // the try/catch below is because MIDI files might have sysex messages, which we aren't allowed to send
      setTimeout(function() { try { device.send(msg); } catch(e) { } }, (t-this.actx.currentTime)*1000);
    },
    _send:function(msg,t){    /* send midi message (DW new: INTERNAL version of send.  Public version now incorporates MIDI input/output multiplexing! */
      var ch=msg[0]&0xf;
      var cmd=msg[0]&~0xf;
      if(cmd<0x80||cmd>=0x100)
        return;
      if(this.audioContext.state=="suspended"){
        this.audioContext.resume();
      }
      switch(cmd){
      case 0xb0:  /* ctl change */
        switch(msg[1]){
        case 1:  this.setModulation(ch,msg[2],t); break;
        case 7:  this.setChVol(ch,msg[2],t); break;
        case 10: this.setPan(ch,msg[2],t); break;
        case 11: this.setExpression(ch,msg[2],t); break;
        case 64: this.setSustain(ch,msg[2],t); break;
        case 98:  case 98: this.rpnidx[ch]=0x3fff; break; /* nrpn lsb/msb */
        case 100: this.rpnidx[ch]=(this.rpnidx[ch]&0x380)|msg[2]; break; /* rpn lsb */
        case 101: this.rpnidx[ch]=(this.rpnidx[ch]&0x7f)|(msg[2]<<7); break; /* rpn msb */
        case 6:  /* data entry msb */
          if(this.rpnidx[ch]==0)
            this.brange[ch]=(msg[2]<<7)+(this.brange[ch]&0x7f);
          break;
        case 38:  /* data entry lsb */
          if(this.rpnidx[ch]==0)
            this.brange[ch]=(this.brange[ch]&0x380)|msg[2];
          break;
        case 120:  /* all sound off */
        case 123:  /* all notes off */
        case 124: case 125: case 126: case 127: /* omni off/on mono/poly */
          this.allSoundOff(ch);
          break;
        case 121: this.resetAllControllers(ch); break;
        }
        break;
      case 0xc0: this.setProgram(ch,msg[1]); break;
      case 0xe0: this.setBend(ch,(msg[1]+(msg[2]<<7)),t); break;
      case 0x90: this.noteOn(ch,msg[1],msg[2],t); break;
      case 0x80: this.noteOff(ch,msg[1],t); break;
      case 0xf0:
        if(msg[0]!=254 && this.debug){
          var ds=[];
          for(var ii=0;ii<msg.length;++ii)
            ds.push(msg[ii].toString(16));
          console.log(ds);
        }
        if(msg[1]==0x41&&msg[2]==0x10&&msg[3]==0x42&&msg[4]==0x12&&msg[5]==0x40){
          if((msg[6]&0xf0)==0x10&&msg[7]==0x15){
            var ch=[9,0,1,2,3,4,5,6,7,8,10,11,12,13,14,15][msg[6]&0xf];
            this.rhythm[ch]=msg[8];
//            console.log("UseForRhythmPart("+ch+")="+msg[8]);
          }
        }
        break;
      }
    },
    _createWave:function(w){
      var imag=new Float32Array(w.length);
      var real=new Float32Array(w.length);
      for(var i=1;i<w.length;++i)
        imag[i]=w[i];
      return this.actx.createPeriodicWave(real,imag);
    },
    getAudioContext:function(){
      return this.actx;
    },
    setAudioContext:function(actx,dest){
      if (!actx) {
        // Internet Explorer or other browsers without WebAudio: Make do with samples if you can.
        // You play the samples with audio tags.
        var that = this;
        this.availableQualities[0] = false; this.availableQualities[1] = false;
        var d = new Date(); this.startingTime = d.getTime()/1000.0;
        this.audioContext = this.actx = { webAudio: false };
        try {   // try a getter and setter that will make currentTime really work
          this.audioContext = this.actx = { 
            webAudio: false,
            get currentTime() {
              var d = new Date(); return d.getTime()/1000.0 - that.startingTime;
            }
          };
        } catch(e) {    // if it doesn't work, set an interval function (way old IE)-- this won't work but will sort of make individual notes play.
          setInterval(function() {
            var d = new Date();
            that.actx.currentTime = d.getTime()/1000.0;
          },5);
        }
        this.chvol = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
        this.reset();
        return;
      }
      this.audioContext=this.actx=actx;
      this.dest=dest;
      if(!dest)
        this.dest=actx.destination;
      //--- some browsers like Edge don't have createConstantSource, but it is handy!  and especially for making my drawbar organ option.
      if (!this.actx.createConstantSource) {		//-- like an AudioNode that with an offset AudioParam that can automate a parameter input to any audio node
        var parentSynth = this;
        this.actx.createConstantSource = function() {		//-- the polyfilled constant source is fully operational!
          var retObj = { }; var ctx = parentSynth.actx;
          retObj.gainNode = ctx.createGain();
          retObj.offset = retObj.gainNode.gain;	// our "offset" audioParam is really the gain param of the inner gain node.
          retObj.buffer = ctx.createBuffer(1,1,44100);  // a buffer with one sample
          var bufferArray = retObj.buffer.getChannelData(0); bufferArray[0] = 1.0;    // whose value is 1, which is multiplied by the gain to pass on to other things.
          retObj.bufferSource = ctx.createBufferSource();
          retObj.bufferSource.buffer = retObj.buffer; retObj.bufferSource.connect(retObj.gainNode);
          retObj.bufferSource.loop = true;
          retObj.connect = function(n) { retObj.gainNode.connect(n); }  // to connect the constant source, connect its inner gain node.
          retObj.start = function(when,offset,duration) { return retObj.bufferSource.start(when,offset,duration); }
          retObj.stop = function(when) { return retObj.bufferSource.stop(when); }
          return retObj;
        };
      }
      this.tsdiff=performance.now()*.001-this.actx.currentTime;
      //console.log("TSDiff:"+this.tsdiff);
      this.out=this.actx.createGain();
      this.comp=this.actx.createDynamicsCompressor();
      var blen=this.actx.sampleRate*.5|0;
      this.convBuf=this.actx.createBuffer(2,blen,this.actx.sampleRate);
      this.noiseBuf={};
      this.noiseBuf.n0=this.actx.createBuffer(1,blen,this.actx.sampleRate);
      this.noiseBuf.n1=this.actx.createBuffer(1,blen,this.actx.sampleRate);
      var d1=this.convBuf.getChannelData(0);
      var d2=this.convBuf.getChannelData(1);
      var dn=this.noiseBuf.n0.getChannelData(0);
      var dr=this.noiseBuf.n1.getChannelData(0);
      for(var i=0;i<blen;++i){
        if(i/blen<Math.random()){
          d1[i]=Math.exp(-3*i/blen)*(Math.random()-.5)*.5;
          d2[i]=Math.exp(-3*i/blen)*(Math.random()-.5)*.5;
        }
        dn[i]=Math.random()*2-1;
      }
      for(var jj=0;jj<64;++jj){
        var r1=Math.random()*10+1;
        var r2=Math.random()*10+1;
        for(i=0;i<blen;++i){
          var dd=Math.sin((i/blen)*2*Math.PI*440*r1)*Math.sin((i/blen)*2*Math.PI*440*r2);
          dr[i]+=dd/8;
        }
      }
      if(this.useReverb){
        this.conv=this.actx.createConvolver();
        this.conv.buffer=this.convBuf;
        this.rev=this.actx.createGain();
        this.rev.gain.value=this.reverbLev;
        this.out.connect(this.conv);
        this.conv.connect(this.rev);
        this.rev.connect(this.comp);
      }
      this.setMasterVol();
      this.out.connect(this.comp);
      this.comp.connect(this.dest);
      // debugging
      // this.out.disconnect(); this.out.connect(this.dest);  // to debug you can skip all the postprocessing and see what it sounds like
      // end debugging
      this.chvol=[]; this.chmod=[]; this.chpan=[];
      this.wave={"w9999":this._createWave("w9999")};
      this.lfo=this.actx.createOscillator();
      this.lfo.frequency.value=5;
      this.lfo.start(0);
      for(i=0;i<16;++i){
        this.chvol[i]=this.actx.createGain();
        if(this.actx.createStereoPanner){
          this.chpan[i]=this.actx.createStereoPanner();
          this.chvol[i].connect(this.chpan[i]);
          this.chpan[i].connect(this.out);
        }
        else{
          this.chpan[i]=null;
          this.chvol[i].connect(this.out);
        }
        this.chmod[i]=this.actx.createGain();
        this.lfo.connect(this.chmod[i]);
        this.pg[i]=0;
        this.resetAllControllers(i);
      }
      this.setReverbLev();
      this.reset();
      //-- the original sent this note, I'm not sure why.  I'm turning it off.
      //this._send([0x90,60,1]);
      //this._send([0x90,60,0]);
    },
    //------ DW: Code from my MIDI Access Module expands the tiny synth to 
    //------ automatically be able to handle incoming and outgoing MIDI messages
    //------ intended for multiple sources/destinations.
    getInputs: function() { return this.inputList; },
    getOutputs: function() { return this.outputList; },
    refreshInputs: function () {
      if (!this.MIDIAccess) return;
      // read all the midi inputs into the inputList array.  Include internal input choice.
      this.inputList = [ { id: "internal", name: "On Screen Keyboard"} ];
      this.inputHash = { "internal": null };
      var allInputs = this.MIDIAccess.inputs; var midi = this;
      allInputs.forEach(function(thisInput) {
        midi.inputList.push({id: thisInput.id, name: thisInput.name});
        midi.inputHash[thisInput.id] = thisInput;
      });
      return midi.inputList;
    },
    refreshOutputs: function() {
      // reads all the MIDI outputs, includes one that directs sounds to the internal TinySynth!
      if (!this.MIDIAccess) return;
      this.outputList = [ { id: "internal", name: "Internal Synthesizer"}];
      this.outputHash = { "internal": null };
      var allOutputs = this.MIDIAccess.outputs; var midi = this;
      allOutputs.forEach(function(thisOutput) { 
        midi.outputList.push({id: thisOutput.id, name: thisOutput.name});
        midi.outputHash[thisOutput.id] = thisOutput;
      });
      return midi.outputList;
    },
    closeAllInputs: function() {
      // be good about closing inputs and outputs when not in use.
      // we don't listen on all inputs because then no other programs may be able to use them.
      this.refreshInputs();
      for (var i = 0; i < this.inputList.length; i++) {
        if (!this.inputHash[this.inputList[i].id]) continue;  // skip internal input
        try { 
          //Chrome doesn't like closing things, unfortunately.
          //this.inputHash[this.inputList[i].id].close();
          this.inputHash[this.inputList[i].id].onmidimessage = undefined; 
        } catch(e) { }
      }
    },
    closeAllOutputs: function() { 
      this.refreshOutputs();
      for (var i = 0; i < this.outputList.length; i++) {
        try { this.outputHash[this.outputList[i].id].close(); } catch(e) { }
      }
    },
    setOutput: function(oids) {
      // sets the output to the given ARRAY of IDs.  
      // closes all other outputs.  Note: that means we can set multiple outputs, and then it
      // will send all signals to all of them.
      this.closeAllOutputs();
      this.selectedOutputs = oids.slice(0);
      this.output = [ ];
      for (var i = 0; i < oids.length; i++) {
        if (this.outputHash.hasOwnProperty(oids[i]))
          this.output.push(this.outputHash[oids[i]]);
      }
      return true;
    },
    handleMIDIInput: function(message) {
      // this is the function that gets the midi input message first.
      if (this.onmidimessage) this.onmidimessage(message);  // we just pass it along if a handler is set
      if (this.passThruMIDI) this.send(message.data);   // also, automatic passthrough unless you turn it off
    },
    setInput:function(iids) {
      // sets the input to the given ARRAY of IDs.  
      // closes all other inputs.  Note: that means you can set multiple inputs, and it will
      // send input messages for all of them; you can use the message's data to find out which one
      // sent the input.
      this.closeAllInputs();
      this.selectedInputs = iids.slice(0);
      this.input = [ ]; var midi = this;
      for (var i = 0; i < iids.length; i++) {
        if (this.inputHash.hasOwnProperty(iids[i])) {
          var thisInput = midi.inputHash[iids[i]];
          if (thisInput) {
            thisInput.onmidimessage = function(m) { midi.handleMIDIInput(m); };
            thisInput.open();
          }
          this.input.push(thisInput);
        }
      }
      return true;
    },
    isMIDIEnabled : function() { return this.MIDIEnabled; },
    setupMIDIDevices : function(callbackSuccess, callbackFailure) {
      var midi = this;
      if (!navigator.requestMIDIAccess) {   // check if browser supports MIDI!
        if (callbackFailure) callbackFailure(); return;
      }
      navigator.requestMIDIAccess({software: true}).then(function(m) {
        midi.MIDIEnabled = true;
        midi.MIDIAccess = m;
        midi.refreshInputs();
        midi.refreshOutputs();
        if (callbackSuccess) callbackSuccess();
      },function() {
        midi.MIDIEnabled = false;
        if (callbackFailure) callbackFailure();
      });
    },
    //------ end MIDI Access Module
  }
/* webaudio-tinysynth coreobject */

;
  for(var k in this.sy.properties)
    this[k]=this.sy.properties[k].value;
  this.setQuality(1);
  if(opt){
    if(opt.useReverb!=undefined)
      this.useReverb=opt.useReverb;
    if(opt.quality!=undefined)
      this.setQuality(opt.quality);
    if(opt.voices!=undefined)
      this.setVoices(opt.voices);
  }
  this.ready();
}

export let Synth = new WebAudioTinySynth({voices:64});
