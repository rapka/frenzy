precision highp float;
uniform sampler2D source;
varying vec2 uv;
uniform float visualizerMode;

void main(){
    gl_FragColor = texture2D(source, uv);
}
