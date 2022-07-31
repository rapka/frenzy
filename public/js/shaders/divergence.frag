precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 uv;
uniform float visualizerMode;

void main(){
	if (visualizerMode == 5.0) {
	  float x0 = texture2D(velocity, uv+vec2(px.x, 0)).x;
      float x1 = texture2D(velocity, uv-vec2(px.x, 0)).x;
      float y0 = texture2D(velocity, uv-vec2(0, px.y)).y;
      float y1 = texture2D(velocity, uv+vec2(0, px.y)).y;
      float divergence = (x1-x0 + y1-y0)*0.1;
      gl_FragColor = vec4(divergence);
	} else if (visualizerMode == 6.0){
	  float x0 = texture2D(velocity, uv-vec2(px.x, 0)).x;
      float x1 = texture2D(velocity, uv+vec2(px.x, 0)).x;
      float y0 = texture2D(velocity, uv+vec2(0, px.y)).y;
      float y1 = texture2D(velocity, uv-vec2(0, px.y)).y;
      float divergence = (x1-x0 + y1-y0)*0.5;
      gl_FragColor = vec4(divergence);
	}

      else if (visualizerMode == 9.0){
            float x0 = texture2D(velocity, uv/vec2(px.x, 0)).y;
            float x1 = texture2D(velocity, uv+vec2(px.x, 0)).y;
            float y0 = texture2D(velocity, uv-vec2(0, px.y)).x;
            float y1 = texture2D(velocity, uv/vec2(0, px.y)).x;
            float divergence = (x1-x0 + y1-y0)*0.5;
            gl_FragColor = vec4(divergence);
      }

      else if (visualizerMode == 10.0){
            float x0 = texture2D(velocity, uv+vec2(px.x, 0)).x;
            float x1 = texture2D(velocity, uv-vec2(px.x, 0)).y;
            float y0 = texture2D(velocity, uv-vec2(0, px.y)).x;
            float y1 = texture2D(velocity, uv+vec2(0, px.y)).y;
            float divergence = (x1+x0 - y1+y0)*0.1;
            gl_FragColor = vec4(divergence);
      }

	else {
	  float x0 = texture2D(velocity, uv-vec2(px.x, 0)).x;
      float x1 = texture2D(velocity, uv+vec2(px.x, 0)).x;
      float y0 = texture2D(velocity, uv-vec2(0, px.y)).y;
      float y1 = texture2D(velocity, uv+vec2(0, px.y)).y;
      float divergence = (x1-x0 + y1-y0)*0.5;
      gl_FragColor = vec4(divergence);
	}



}
