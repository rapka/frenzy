define(function(require, exports, module){
require('game-shim');
// only when optimized

var desktop = true;
var renderBlood = true;

if (window.matchMedia("screen and (max-device-width: 480px)").matches) {
	desktop = false;
}

var intervalID;
var audioBufferSouceNode;
var currentTrack = 0;
var offset = 0;
var startTime = 0;
var activeRelease = 2;
var paused = false;
var tickCounter = 0;

var playing = false;
var bloodHeight = 20;
var bloodPower = 20;
var bloodWidth = 20;
var bloodCursor = 80;
var options = {
	iterations: 18,
	mouse_force: 10,
	resolution: 0.5,
	cursor_size: 80,
	step: 1/60
};

var releases = {
	1: {
		number: 'FRENZY001',
		artist: 'Fallow',
		title: 'Loco /  Touch Ya Knees',
		date: '23/01/2017',
		mp3: 'loco.mp3',
		redeye: 'http://www.redeyerecords.co.uk/vinyl/80832-frenzy001-fallow',
		bandcamp: 'https://bloodfrenzy.bandcamp.com/releases'
	},
	2: {
		number: 'FRENZY002',
		artist: 'Splurt Diablo',
		title: 'Amped / Irn Bru',
		date: '07/05/2018',
		mp3: 'amped.mp3',
		redeye: 'https://www.redeyerecords.co.uk/vinyl/96419-frenzy002-splurt-diablo',
		bandcamp: 'https://bloodfrenzy.bandcamp.com/releases'
	}
}

window.onload = function() {
	if (!desktop) {
		$('#stop').hide();
		$('#hide').hide();
	}

	new Visualizer().ini();
	var player = document.getElementById("player");
	var audioCtx = new (window.AudioContext || window.webkitAudioContext);

	$('.info-link').click(function () {
		$('.info-link').removeClass('selected');
		$('.site-section').removeClass('selected');
		$('.' + $(this)[0].id + '-section').toggleClass('selected');
		$(this).toggleClass('selected');
	});

	$('#release-number').text(releases[activeRelease].number);
	$('#release-artist').text(releases[activeRelease].artist);
	$('#release-title').text(releases[activeRelease].title);
	$('#release-date').text(releases[activeRelease].date);
	$('#bandcamp').attr('href', releases[activeRelease].bandcamp);
	$('#juno').attr('href', releases[activeRelease].juno);
	$('#boomkat').attr('href', releases[activeRelease].boomkat);
	$('#redeye').attr('href', releases[activeRelease].redeye);
	$('#bleep').attr('href', releases[activeRelease].bleep);
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
		if ($('#hide').text() === '[show site]') {
			$('#hide').text('[hide site]');
		} else {
			$('#hide').text('[show site]');
		}
		$('.label-title, .label-logo, .site-section, .site-info, .stop').toggleClass('hidden');
	});
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
	_addEventListner: function() {
		var that = this;

		var listenButton = document.getElementById('listen-button');
		listenButton.addEventListener("click", function() {
			var loaded = false;
			if (!playing && currentTrack != activeRelease) {
				var request = new XMLHttpRequest();
				request.open('GET', 'track/' + releases[activeRelease].mp3, true);
				request.responseType = 'arraybuffer';
				listenButton.innerHTML = '...';

				request.onload = function() {
						var audioData = request.response;
						that.audioContext.decodeAudioData(audioData, function(buffer) {
							currentTrack = activeRelease;
							playing = true;
							//window.clearInterval(intervalID);
							offset = 0;
							startTime = Date.now();
							paused = false;
							that._visualize(that.audioContext, buffer, offset, listenButton);
							listenButton.innerHTML = 'Pause';
						}, function(e){"Error with decoding audio data" + e.err});
				}
				request.send();

			}
			else if (playing){
				audioBufferSouceNode.stop();
				offset = Date.now() - startTime;
				paused = true;
				listenButton.innerHTML = 'Listen';
				playing = true;
			}
			else if (!playing && offset == 0) {
				listenButton.innerHTML = 'Pause';
				offset = 0;
				startTime = Date.now();
				that._visualize(that.audioContext, audioBufferSouceNode.buffer, offset, listenButton);
				paused = false;
				playing = true;
			}
			else {
				startTime = Date.now() - offset;
				listenButton.innerHTML = 'Pause';
				that._visualize(that.audioContext, audioBufferSouceNode.buffer, (offset / 1000) % audioBufferSouceNode.buffer.duration, listenButton);
				paused = false;
				playing = true;
			}

		}, false);

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
			analyser.minDecibels = -80;
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

			 for (var i = 500; i < 1000; i++) {
					highSum += array[i];
			};
			var highValue = (highSum / 500) * 5;
			var midValue = (midSum / 300) * 1.5;

			//Transform sub value
			bassValue = Math.max(0, 10 * (Math.exp(bassValue * 0.02) - 2));
			kickValue = Math.max(0, 10 * (Math.exp((kickValue + 10) * 0.02) - 2));


			var rect = canvas.getBoundingClientRect();
			if (playing && !paused) {
				bloodWidth = (rect.width / 2) - 300 + kickValue + bassValue;
				bloodHeight = (rect.height / 2) - 125 + 1.3 * midValue - highValue;
				bloodPower = Math.max((bassValue / 11), 3);
				bloodCursor = bloodPower * 1.8 + 20;
				options.mouse_force = bloodPower;
			}
			that.animationId = requestAnimationFrame(drawMeter);
		}
		this.animationId = requestAnimationFrame(drawMeter);
	},
	_audioEnd: function(instance) {
		resetBlood();
		if (this.forceStop) {
			this.forceStop = false;
			this.status = 1;
			return;
		};
		this.status = 0;
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
				dt: options.step
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
				dt: 1/60
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
				scale: vec2.create([options.cursor_size*px_x, options.cursor_size*px_y])
			},
			output: velocityFBO1
		}),
		divergenceKernel = new ComputeKernel(gl, {
			shader: shaders.get('kernel', 'divergence'),
			mesh: all,
			uniforms: {
				velocity: velocityFBO1,
				px: px
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
				px: px
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
				px: px
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
				px: px
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
				px: px
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
				color: false
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
		tickCounter++;

		if (tickCounter % 500 == 0) {
			tickCounter = 0;
		}

		if (!playing && tickCounter == 80) {
			bloodPower = 10;
			bloodWidth = (rect.width / 2) + (Math.random()*1000 - 500);
			bloodHeight = (rect.height / 2) + (Math.random()*600 - 300);
			var x1 = bloodWidth * options.resolution,
				y1 = bloodHeight * options.resolution,
				xd = x1-x0,
				yd = y1-y0;

			x0 = x1,
			y0 = y1;
			if(x0 === 0 && y0 === 0) xd = yd = 0;

			vec2.set([xd*px_x*60*(Math.random()*10 - 5),
					 -yd*px_y*70*(Math.random()*10 - 5)], addForceKernel.uniforms.force);
			vec2.set([x0*px_x*2-1.0, (y0*px_y*2-1.0)*-1], addForceKernel.uniforms.center);

		 } else {
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
		}

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

if(desktop && gl) {

}

});
