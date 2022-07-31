precision highp float;
uniform sampler2D velocity;
uniform sampler2D pressure;
varying vec2 uv;
uniform float visualizerMode;
uniform bool color;

void main(){
    float x = texture2D(velocity, uv).x;

    if (x > 0.9) {
      //x = 0.05;
      //x / 10.0;
      x = 1.4 + -1.2 * x; 
    }

    if (color) {
      gl_FragColor = vec4(
        (texture2D(velocity, uv)).xy,
        (texture2D(pressure, uv)).x,
          
      1.0);
    } else { 
      gl_FragColor = vec4(
        x * 2.4,
        (texture2D(pressure, uv) * .1).xy,
      1.0);
    }



     // zero out high freq data
  //if (gl_FragColor[1] > 0.99 || gl_FragColor[2] > 0.99) {
  //	gl_FragColor[0] = 0.0;
  //	gl_FragColor[1] = 0.0;
  //	gl_FragColor[2] = 0.0;
  //}

   //gl_FragColor[1] = gl_FragColor[1] * 40.0;
   //gl_FragColor[2] = gl_FragColor[2] * 40.0;

    // Convert to red

    if (!color) {
      gl_FragColor[0] = min(1.0, (gl_FragColor[0] + gl_FragColor[1] + gl_FragColor[2]) / 0.8);
      gl_FragColor[1] = 0.0;
      gl_FragColor[2] = 0.0;
    }


    // Specular effect
    if (gl_FragColor[0] > 0.98) {
    	gl_FragColor[1] = (gl_FragColor[0] - 0.9);
    	gl_FragColor[2] = (gl_FragColor[0] - 0.9);
    }

    if (gl_FragColor[0] > 0.7) {
    	gl_FragColor[0] = 0.7;
    }

    gl_FragColor[2] = gl_FragColor[2] + 0.02;

}
