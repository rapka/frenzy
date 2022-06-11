define(function(require, exports, module){
require('game-shim');

require('adapter-latest');

var desktop = true;
var renderBlood = true;

if (window.matchMedia("screen and (max-device-width: 480px)").matches) {
	desktop = false;
}

console.log('Desktop mode:', desktop);

var BPM = 135;
var resetRate = Math.floor((1 / BPM) * 60 * 60 * 4 * 4);

var initState = true;
var intervalID;
var audioBufferSouceNode;
var currentTrack = 0;
var offset = 0;
var startTime = 0;
var activeRelease = 1;
var paused = false;
var tickCounter = 0;
var monitor = false;

var playing = false;
var bloodHeight = 20;
var bloodPower = 20;
var bloodWidth = 20;
var bloodCursor = 80;
var options = {
	iterations: 18,
	mouse_force: 10,
	resolution: 0.5,
	cursor_size: 90,
	step: 1/60
};

var forceColor = false;
var colorOn = false;
var gainNode;
var visualizerMode = 1.0;

var indices = [0, 0, 1, 0, 1, 2, 5, 6, 7, 4, 3, 2, 10, 5, 2, 1, 4, 3, 5, 2, 1, 0, 2, 6, 7, 1, 10, 1, 2, 7, 8, 5, 6, 3, 2, 1];
var forceIndices = [false, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, 
	true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, ];

var modeIndex = 0;

window.onload = function() {
	console.log('Welcome to the blood frenzy realtime visualizer!');
	console.log('Only Chrome is supported at the moment');
	console.log('Tempo defaults to 140BPM. Visualizer switches every 8 bars')
	console.log('Controls:');
	console.log('H: disable visualiztion entirely (panic button)');
	console.log('M: Mute/unmute audio monitoring. Disabled by default');
	console.log('C:Toggle forcing of full color visualizations');
	console.log('1/2: -/+1 BPM to tempo');
	console.log('Q/W: -/+10 BPM to tempo');

	if (!desktop) {
		$('#stop').hide();
		$('#hide').hide();
	}

	$(document).keypress(function(event) {

		// Disable vis entirely
		if (event.key.toLowerCase() === 'h') {
			renderBlood = !renderBlood;
			console.log('Toggling visualiztion...');

			if (gl) {
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			}
		}
		// (un) mute audio
		else if (event.key.toLowerCase() === 'm') {
			
			if (gainNode.gain.value === 0) {
				console.log('Unmuting...');
				gainNode.gain.value = 1;
			} else {
				console.log('Muting...');
				gainNode.gain.value = 0;
			}
		} else if (event.key.toLowerCase() === 'r') {
			console.log('Resetting timer...');
			tickCounter = -1;
		} else if (event.key.toLowerCase() === 'c') {
			console.log('Toggling force full color...', !forceColor);
			forceColor = !forceColor;
			tickCounter = -1;
		} else if (event.key.toLowerCase() === '1') {
			BPM = BPM - 1;
			console.log('New tempo:', BPM);
		} else if (event.key.toLowerCase() === '2') {
			BPM = BPM + 1;
			console.log('New tempo:', BPM);
		} else if (event.key.toLowerCase() === 'q') {
			BPM = BPM - 10;
			console.log('New tempo:', BPM);
		} else if (event.key.toLowerCase() === 'w') {
			BPM = BPM + 10;
			console.log('New tempo:', BPM);
		}
	});

	new Visualizer().ini();
	var player = document.getElementById("player");
	var audioCtx = new (window.AudioContext || window.webkitAudioContext);
	gainNode = audioCtx.createGain();

	$('.info-link').click(function () {
		console.log($(this)[0].id);
		$('.info-link').removeClass('selected');
		$('.site-section').removeClass('selected');
		$('.' + $(this)[0].id + '-section').toggleClass('selected');
		$(this).toggleClass('selected');
	});

	
	$('#stop').click(function () {
		renderBlood = !renderBlood;

		if (gl) {
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}

		if(renderBlood) {
			$('#stop').text('[disable visualization]');
		} else {
			$('#stop').text('[enable visualization]');
		}

	});

	$('#hide').click(function () {
		if (gainNode.gain.value === 0) {
			gainNode.gain.value = 1;
		} else {
			gainNode.gain.value = 0;
		}
	});

	//start visualizer immediately
	var that = this;

	var listenButton = document.getElementById('listen-button');
	
	var loaded = false;
	
	var request = new XMLHttpRequest();
	// fork getUserMedia for multiple browser versions, for those that need prefixes

};

var resetBlood = function () {
	bloodHeight = 50;
	bloodWidth = 50;
	bloodPower = 10;
	bloodCursor = 120;
}

var Visualizer = function() {
	this.audioContext = null,
	this.source = null, //the audio source
	this.infoUpdateId = null, //to store the setTimeout ID and clear the interval
	this.animationId = null,
	this.status = 0, //flag for sound is playing 1 or stopped 0
	this.forceStop = false,
	this.allCapsReachBottom = false
};

Visualizer.prototype = {
	ini: function() {
		this._prepareAPI();
		this._addEventListner();
	},
	_prepareAPI: function() {
		//fix browser vender for AudioContext and requestAnimationFrame
		window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
		window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
		window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
		try {
			this.audioContext = new AudioContext();
		} catch (e) {
			console.log(e);
		}
	},

	_visualize: function(audioContext, buffer, offset, track) {
		audioBufferSouceNode = audioContext.createBufferSource(),
		analyser = audioContext.createAnalyser(),
		that = this;
		//connect the source to the analyser
		audioBufferSouceNode.connect(analyser);
		//connect the analyser to the destination(the speaker), or we won't hear the sound
		analyser.connect(audioContext.destination);
		//then assign the buffer to the buffer source node
		if (buffer == null) {
			audioBufferSouceNode.stop();
			return;
		}

		audioBufferSouceNode.buffer = buffer;

		//play the source
		if (!audioBufferSouceNode.start) {
			audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
			audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOn method
		};

		//stop the previous sound if any
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
		}
		if (this.source !== null) {
			this.source.stop(0);
		}
		audioBufferSouceNode.start(0, offset);
		tickCounter = 0;
		
		this.status = 1;
		this.source = audioBufferSouceNode;
		audioBufferSouceNode.onended = function() {
			offset = 0;
			if (!paused) {
				currentTrack = 0;
			}

			startTime = 0;
			playing = false;

			track.innerHTML = 'Listen';
		};
		if (desktop) {
			this._drawSpectrum(analyser);
		}

	},
	_addEventListner: function() {
		var that = this;

		var listenButton = document.getElementById('listen-button');
		document.addEventListener("keydown", function(event) {
			if (event.key !== ' ') {
				return;
			}

			var loaded = false;
			if (!playing && currentTrack != activeRelease) {
				var request = new XMLHttpRequest();
				request.open('GET', 'track/knees.wav', true);
				request.responseType = 'arraybuffer';

				request.onload = function() {
						var audioData = request.response;
						that.audioContext.decodeAudioData(audioData, function(buffer) {
							currentTrack = activeRelease;
							playing = true;
							//window.clearInterval(intervalID);
							offset = 0;
							startTime = Date.now();
							paused = false;

							setTimeout( function() { 
								$( '#op' ).fadeIn( 'slow' );
								SPY.text( 'op' );
							}, 1000);
							setTimeout( function() { 
								$( '#op2' ).fadeIn( 'slow' );
								SPY.text( 'op2' );
							}, 7000);
							setTimeout( function() { 
								$( '.demoText' ).fadeOut( 'slow' );
							}, 27000);
							that._visualize(that.audioContext, buffer, offset, listenButton);
						}, function(e){"Error with decoding audio data" + e.err});
				}
				request.send();

			}
			else if (playing){
				audioBufferSouceNode.stop();
				offset = Date.now() - startTime;
				paused = true;
				playing = true;
			}
			else if (!playing && offset == 0) {
				offset = 0;
				startTime = Date.now();
				//that._visualize(that.audioContext, audioBufferSouceNode.buffer, offset, listenButton);
				paused = false;
				playing = true;
			}
			else {
				startTime = Date.now() - offset;
				//that._visualize(that.audioContext, audioBufferSouceNode.buffer, (offset / 1000) % audioBufferSouceNode.buffer.duration, listenButton);
				paused = false;
				playing = true;
			}

		}, false);

	},
	_drawSpectrum: function(analyser) {
		var that = this,
			canvas = document.getElementById('c'),
			cwidth = canvas.width,
			cheight = canvas.height - 2,
			meterWidth = 10, //width of the meters in the spectrum
			gap = 2, //gap between meters
			capHeight = 2,
			capStyle = '#fff',
			meterNum = 800 / (10 + 2), //count of the meters
			capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame
		//ctx = canvas.getContext('2d'),
		if (!renderBlood) {
			return;
		}
		var drawMeter = function() {

			analyser.fftSize = 2048;
			analyser.minDecibels = -90;
			analyser.maxDecibels = -10;
			var array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			if (that.status === 0) {
				//fix when some sounds end the value still not back to zero
				for (var i = array.length - 1; i >= 0; i--) {
					array[i] = 0;
				};
				allCapsReachBottom = true;
				for (var i = capYPositionArray.length - 1; i >= 0; i--) {
					allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
				};
				if (allCapsReachBottom) {
					cancelAnimationFrame(that.animationId); //since the sound is top and animation finished, stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
					return;
				};
			};

			var bassValue = (array[0] + array[1] + array[2] + array[3]) / 4;
			var kickValue = (array[3] + array[4] + array[5] + array[6] + array[7] ) / 5;
			var midSum = 0;
			var highSum = 0;
			for (var i = 25; i < 325; i++) {
					midSum += array[i];
			};

			 for (var i = 400; i < 1000; i++) {
					highSum += array[i];
			};
			var highValue = (highSum / 500) * 5;
			var midValue = (midSum / 300) * 2;

			//Transform sub value
			bassValue = Math.max(0, 6 * (Math.exp(bassValue * 0.02) - 2));
			kickValue = Math.max(0, 6 * (Math.exp((kickValue + 10) * 0.02) - 2));

			// console.log('sub', bassValue, 'kick', kickValue);

			var rect = canvas.getBoundingClientRect();
				bloodWidth = (rect.width / 2) - 285 + kickValue + bassValue;
				bloodHeight = (rect.height / 2) - 130 + 1.3 * midValue - highValue;
				bloodPower = Math.max((bassValue / 10), 3);
				bloodCursor = bloodPower * 1.8 + 20;
				options.mouse_force = bloodPower;
			that.animationId = requestAnimationFrame(drawMeter);

		}
		this.animationId = requestAnimationFrame(drawMeter);
	}

}

if (desktop) {
	var Loader = require('engine/loader'),
	Clock = require('engine/clock').Clock,
	InputHandler = require('engine/input').Handler,
	debounce = require('engine/utils').debounce,
	ShaderManager = require('engine/gl/shader').Manager,
	geometry = require('engine/gl/geometry'),
	FBO = require('engine/gl/texture').FBO,
	Mesh = require('engine/gl/mesh').Mesh,
	glcontext = require('engine/gl/context'),
	glm = require('gl-matrix'),
	ComputeKernel = require('compute').Kernel,
	vec2 = glm.vec2;

	var canvas = document.getElementById('c'),
		gl = glcontext.initialize(canvas, {
			context: {
				depth: false
			},
			debug: false,
			//log_all: true,
			extensions: {
				texture_float: true
			}
		}, fail),
		clock = new Clock(canvas),
		input = new InputHandler(canvas),
		loader = new Loader(),
		resources = loader.resources,
		shaders = new ShaderManager(gl, resources);

	window.gl = gl;

	console.log('loading shaders...');
	loader.load([
			'js/shaders/advect.frag',
			'js/shaders/addForce.frag',
			'js/shaders/divergence.frag',
			'js/shaders/jacobi.frag',
			'js/shaders/subtractPressureGradient.frag',
			'js/shaders/visualize.frag',
			'js/shaders/cursor.vertex',
			'js/shaders/boundary.vertex',
			'js/shaders/kernel.vertex'
	], init);
}

function fail(el, msg, id) {
	document.getElementById('video').style.display = 'block';
}

function hasFloatLuminanceFBOSupport(){
	var fbo = new FBO(gl, 32, 32, gl.FLOAT, gl.LUMINANCE);
	return fbo.supported;
}

function init(){
	// just load it when it's there. If it's not there it's hopefully not needed.
	gl.getExtension('OES_texture_float_linear');
	var format = hasFloatLuminanceFBOSupport() ? gl.LUMINANCE : gl.RGBA,
		onresize;
	window.addEventListener('resize', debounce(onresize = function(){
		var rect = canvas.getBoundingClientRect(),
			width = rect.width * options.resolution,
			height = rect.height * options.resolution;
		//console.log(rect.width, rect.height);
		//if(rect.width != canvas.width || rect.height != canvas.height){
			input.updateOffset();
			window.clearInterval(intervalID);
			setup(width, height, format);
		//}
	}, 250));

	onresize();
	clock.start();
}

function setup(width, height, singleComponentFboFormat){
	console.log('mode', visualizerMode);
	if (!desktop) {
		return;
	}

	canvas.width = width,
	canvas.height = height;

	gl.viewport(0, 0, width, height);
	gl.lineWidth(1.0);

	var px_x = 1.0/canvas.width,
		px_y = 1.0/canvas.height,
		px = vec2.create([px_x, px_y]);
		px1 = vec2.create([1, canvas.width/canvas.height]),
		inside = new Mesh(gl, {
			vertex: geometry.screen_quad(1.0-px_x*2.0, 1.0-px_y*2.0),
			attributes: {
				position: {}
			}
		}),
		all = new Mesh(gl, {
			vertex: geometry.screen_quad(1.0, 1.0),
			attributes: {
				position: {}
			}
		}),
		boundary = new Mesh(gl, {
			mode: gl.LINES,
			vertex: new Float32Array([
				// bottom
				-1+px_x*0.0, -1+px_y*0.0,
				-1+px_x*0.0, -1+px_y*2.0,

				 1-px_x*0.0, -1+px_y*0.0,
				 1-px_x*0.0, -1+px_y*2.0,

				// top
				-1+px_x*0.0,	1-px_y*0.0,
				-1+px_x*0.0,	1-px_y*2.0,

				 1-px_x*0.0,	1-px_y*0.0,
				 1-px_x*0.0,	1-px_y*2.0,

				// left
				-1+px_x*0.0,	1-px_y*0.0,
				-1+px_x*2.0,	1-px_y*0.0,

				-1+px_x*0.0, -1+px_y*0.0,
				-1+px_x*2.0, -1+px_y*0.0,

				// right
				 1-px_x*0.0,	1-px_y*0.0,
				 1-px_x*2.0,	1-px_y*0.0,

				 1-px_x*0.0, -1+px_y*0.0,
				 1-px_x*2.0, -1+px_y*0.0

			]),
			attributes: {
				position: {
					size: 2,
					stride: 16,
					offset: 0
				},
				offset: {
					size: 2,
					stride: 16,
					offset: 8
				}
			}
		}),
		velocityFBO0 = new FBO(gl, width, height, gl.FLOAT),
		velocityFBO1 = new FBO(gl, width, height, gl.FLOAT),
		divergenceFBO = new FBO(gl, width, height, gl.FLOAT, singleComponentFboFormat),
		pressureFBO0 = new FBO(gl, width, height, gl.FLOAT, singleComponentFboFormat),
		pressureFBO1 = new FBO(gl, width, height, gl.FLOAT, singleComponentFboFormat),
		advectVelocityKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'advect'),
			mesh: inside,
			uniforms: {
				px: px,
				px1: px1,
				scale: 1.0,
				velocity: velocityFBO0,
				source: velocityFBO0,
				dt: options.step,
				visualizerMode: visualizerMode
			},
			output: velocityFBO1
		}),
		velocityBoundaryKernel = new ComputeKernel(gl, {
			shader: shaders.get('boundary', 'advect'),
			mesh: boundary,
			uniforms: {
				px: px,
				scale: -1.0,
				velocity: velocityFBO0,
				source: velocityFBO0,
				dt: 1/60,
				visualizerMode: visualizerMode
			},
			output: velocityFBO1
		}),
		cursor = new Mesh(gl, {
			vertex: geometry.screen_quad(px_x*options.cursor_size*2, px_y*options.cursor_size*2),
			attributes: {
				position: {}
			}
		}),
		addForceKernel = new ComputeKernel(gl, {
			shader: shaders.get('cursor', 'addForce'),
			mesh: cursor,
			blend: 'add',
			uniforms: {
				px: px,
				force: vec2.create([0.5, 0.2]),
				center: vec2.create([0.1, 0.4]),
				scale: vec2.create([options.cursor_size*px_x, options.cursor_size*px_y]),
				visualizerMode: visualizerMode
			},
			output: velocityFBO1
		}),
		divergenceKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'divergence'),
			mesh: all,
			uniforms: {
				velocity: velocityFBO1,
				px: px,
				visualizerMode: visualizerMode
			},
			output: divergenceFBO
		}),
		jacobiKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'jacobi'),
			// use all so the simulation still works
			// even if the pressure boundary is not
			// properly enforced
			mesh: all,
			nounbind: true,
			uniforms: {
				pressure: pressureFBO0,
				divergence: divergenceFBO,
				alpha: -1.0,
				beta: 0.25,
				px: px,
				visualizerMode: visualizerMode
			},
			output: pressureFBO1
		}),
		pressureBoundaryKernel = new ComputeKernel(gl, {
			shader: shaders.get('boundary', 'jacobi'),
			mesh: boundary,
			nounbind: true,
			nobind: true,
			uniforms: {
				pressure: pressureFBO0,
				divergence: divergenceFBO,
				alpha: -1.0,
				beta: 0.25,
				px: px,
				visualizerMode: visualizerMode
			},
			output: pressureFBO1
		}),

		subtractPressureGradientKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'subtractPressureGradient'),
			mesh: all,
			uniforms: {
				scale: 1.0,
				pressure: pressureFBO0,
				velocity: velocityFBO1,
				px: px,
				visualizerMode: visualizerMode
			},
			output: velocityFBO0
		}),
		subtractPressureGradientBoundaryKernel = new ComputeKernel(gl, {
			shader: shaders.get('boundary', 'subtractPressureGradient'),
			mesh: boundary,
			uniforms: {
				scale: -1.0,
				pressure: pressureFBO0,
				velocity: velocityFBO1,
				px: px,
				visualizerMode: visualizerMode
			},
			output: velocityFBO0
		}),

		drawKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'visualize'),
			mesh: all,
			uniforms: {
				velocity: velocityFBO0,
				pressure: pressureFBO0,
				px: px,
				visualizerMode: visualizerMode,
				color: forceColor || colorOn
			},
			output: null
		});

	var rect = canvas.getBoundingClientRect();
	var x0 = bloodWidth,
		y0 = bloodHeight;

	clock.ontick = function(dt){
		if (!renderBlood) {
			return;
		}
		
		if (tickCounter % resetRate === 0) {
			console.log('reset', tickCounter, initState, (tickCounter % resetRate === 0) );
			tickCounter = 0;

			var rect = canvas.getBoundingClientRect(),
			width = rect.width * options.resolution,
			height = rect.height * options.resolution;

			gl.getExtension('OES_texture_float_linear');
			var format = hasFloatLuminanceFBOSupport() ? gl.LUMINANCE : gl.RGBA,
				onresize;

			input.updateOffset();
			window.clearInterval(intervalID);

			visualizerMode = indices[modeIndex];
			modeIndex++;
			colorOn = forceIndices[modeIndex];

			setup(width, height, format);
		}

		tickCounter++;

		var x1 = bloodWidth * options.resolution,
			y1 = bloodHeight * options.resolution,
			xd = x1-x0,
			yd = y1-y0;

		x0 = x1,
		y0 = y1;
		if(x0 === 0 && y0 === 0) xd = yd = 0;

		vec2.set([xd*px_x*bloodCursor*bloodPower,
				 -yd*px_y*bloodCursor*bloodPower], addForceKernel.uniforms.force);
		vec2.set([x0*px_x*2-1.0, (y0*px_y*2-1.0)*-1], addForceKernel.uniforms.center);
		

		advectVelocityKernel.uniforms.dt = options.step*1.0;
		advectVelocityKernel.run();
		addForceKernel.run();

		velocityBoundaryKernel.run();

		divergenceKernel.run();

		var p0 = pressureFBO0,
			p1 = pressureFBO1,
			p_ = p0;

		for(var i = 0; i < options.iterations; i++) {
			jacobiKernel.uniforms.pressure = pressureBoundaryKernel.uniforms.pressure = p0;
			jacobiKernel.outputFBO = pressureBoundaryKernel.outputFBO = p1;
			jacobiKernel.run();
			pressureBoundaryKernel.run();
			p_ = p0;
			p0 = p1;
			p1 = p_;
		}

		subtractPressureGradientKernel.run();
		subtractPressureGradientBoundaryKernel.run();

		drawKernel.run();

	};
}
});

var SPY = function() {
	console.log('sspyyyy');
	function e(a, d, b) {
	  var c, f, g, h;
	  b == a.length ? k.animationComplete = !0 : (g = d.innerHTML, h = Math.floor(21 * Math.random() + 5), c = 32 === a[b] ? 32 : a[b] - h, f = setInterval(function() {
	    d.innerHTML = g + String.fromCharCode(c);
	    c == a[b] ? (clearInterval(f), c = 32, b++, setTimeout(function() {
	      e(a, d, b);
	    }, 100)) : c++;
	  }, 50));
	}
	var k = {};
	return k = {animationComplete:!1, text:function(a) {
	  this.animationComplete = !1;
	  a = document.getElementById(a);
	  for (var d = a.innerHTML, b = [], c = 0;c < d.length;c++) {
	    b.push(d.charCodeAt(c));
	  }
	  a.innerHTML = "";
	  e(b, a, 0);
	}};
}();
