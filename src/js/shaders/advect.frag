precision highp float;
uniform sampler2D source;
uniform sampler2D velocity;
uniform float dt;
uniform float scale;
uniform vec2 px1;
varying vec2 uv;
uniform float visualizerMode;

void main(){
    gl_FragColor = texture2D(source, uv-texture2D(velocity, uv).xy*dt*px1)*scale;

        if (gl_FragColor[0] > 0.7) {
    	gl_FragColor[0] = 0.7;
    }
}
