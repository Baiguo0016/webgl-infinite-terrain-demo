const SPEED = 20;
const CAMERA_HEIGHT = 20;
const FIELD_OF_VIEW_RADIANS = 1.5;
const Z_NEAR = 0.1;
const Z_FAR = 100;

const TILE_LENGTH = 20;
const TILE_AREA = TILE_LENGTH * TILE_LENGTH;

const KEYS = {
  W: 87,
  A: 65,
  S: 83,
  D: 68
};

var gl;
var pressedKeys = {};
var position = [-10, 5, -10];
var direction = -Math.PI / 4;
var tileBuffers = {}
var lastTickTime = 0;
var fpsElement;

// Shader variables.
var vertexPositionAttribute;
var vertexNormalAttribute;
var transformMatrixUniform;

window.addEventListener('load', setup);

function setup() {
  setupWebGL();
  setupShaders();
  setupInput();
  fpsElement = document.getElementById('fps');
  tick();
}

function setupWebGL() {
  var canvas = document.getElementById('canvas');
  gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    alert("WebGL not available");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function setupShaders() {
  var fragmentShader = getShader("shader-fs");
  var vertexShader = getShader("shader-vs");

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);

  vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(vertexNormalAttribute);

  transformMatrixUniform = gl.getUniformLocation(shaderProgram, "uTransformMatrix");
}

var lastMouseX, lastMouseY;
var tilt = 0;
function setupInput() {
  window.addEventListener("keydown", function(e) {
    pressedKeys[e.keyCode] = true;
  });

  window.addEventListener("keyup", function(e) {
    delete pressedKeys[e.keyCode];
  });

  window.addEventListener('mousemove', function(e) {
    var dx, dy;
    if (e.movementX != null) {
      dx = e.movementX;
      dy = e.movementY;
    } else if (lastMouseX != null) {
      dx = e.screenX - lastMouseX;
      dy = e.screenY - lastMouseY;
    } else {
      dx = dy = 0;
    }

    tilt += 0.005 * dy;
    tilt = Math.max(tilt, -Math.PI / 2);
    tilt = Math.min(tilt, Math.PI / 2);
    direction -= 0.005 * dx;

    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
  });

  canvas.addEventListener("click", function(e) {
    canvas.requestPointerLock();
  });
}

function tick() {
  var time = performance.now() * 0.001;
  var dt = time - lastTickTime;
  requestAnimationFrame(tick);
  physics(dt);
  render();
  deleteUnusedTileBuffers();

  var fps = 1.0 / dt | 0;
  fpsElement.innerHTML = fps.toString();
  lastTickTime = time;

  if (gl.getError() != gl.NO_ERROR) {
    alert(`OpenGL error: ${gl.getError()}`);
  }
}

function physics(dt) {
  var speed = SPEED * dt * ((KEYS.W in pressedKeys) - (KEYS.S in pressedKeys));
  var strafeSpeed = SPEED * dt * ((KEYS.D in pressedKeys) - (KEYS.A in pressedKeys));

  position[0] += speed * Math.cos(direction) + strafeSpeed * Math.sin(direction);
  position[2] += -speed * Math.sin(direction) + strafeSpeed * Math.cos(direction);
  position[1] = getHeight(position[0], position[2]) + CAMERA_HEIGHT;
}

function render() {
  gl.clearColor(0.6, 0.8, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  setMatrixUniforms();

  var x = position[0], z = position[2];
  var tileMinX = Math.floor((x - Z_FAR) / TILE_LENGTH) * TILE_LENGTH;
  var tileMinZ = Math.floor((z - Z_FAR) / TILE_LENGTH) * TILE_LENGTH;
  var tileMaxX = Math.ceil((x + Z_FAR) / TILE_LENGTH) * TILE_LENGTH;
  var tileMaxZ = Math.ceil((z + Z_FAR) / TILE_LENGTH) * TILE_LENGTH;
  for (tileX = tileMinX; tileX < tileMaxX; tileX += TILE_LENGTH) {
    for (tileZ = tileMinZ; tileZ < tileMaxZ; tileZ += TILE_LENGTH) {
      drawTile(tileX, tileZ);
    }
  }
}

function drawTile(x, z) {
  var buffer = getTileBuffer(x, z);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 24, 12);
  gl.drawArrays(gl.TRIANGLES, 0, TILE_AREA * 6);
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(transformMatrixUniform, false, matrix4Product(createProjectionMatrix(), createModelViewMatrix()));
}

function createProjectionMatrix() {
  var f = 1 / Math.tan(FIELD_OF_VIEW_RADIANS / 2);
  var m = new Float32Array(16);
  m[0] = f * (canvas.clientWidth / canvas.clientHeight);
  m[5] = f;
  m[10] = (Z_NEAR + Z_FAR) / (Z_NEAR - Z_FAR);
  m[11] = -1;
  m[14] = 2 * Z_NEAR * Z_FAR / (Z_NEAR - Z_FAR);
  return m;
}

function createModelViewMatrix() {
  var translationMatrix = matrix4Identity();
  translationMatrix[12] = -position[0];
  translationMatrix[13] = -position[1];
  translationMatrix[14] = -position[2];

  var rot = Math.PI / 2 - direction;
  var rotationMatrix = matrix4Zeros();
  rotationMatrix[0] = Math.cos(rot);
  rotationMatrix[2] = -Math.sin(rot);
  rotationMatrix[5] = 1;
  rotationMatrix[8] = Math.sin(rot);
  rotationMatrix[10] = Math.cos(rot);
  rotationMatrix[15] = 1;

  var tiltMatrix = matrix4Zeros();
  tiltMatrix[0] = 1;
  tiltMatrix[5] = Math.cos(tilt);
  tiltMatrix[6] = Math.sin(tilt);
  tiltMatrix[9] = -Math.sin(tilt);
  tiltMatrix[10] = Math.cos(tilt);
  tiltMatrix[15] = 1;

  rotationMatrix = matrix4Product(tiltMatrix, rotationMatrix);
  return matrix4Product(rotationMatrix, translationMatrix);
}

function getTileBuffer(x1, z1) {
  p1 = [x1, z1];
  if (p1 in tileBuffers) {
    return tileBuffers[p1];
  } else {
    return tileBuffers[p1] = createTileBuffer(x1, z1);
  }
}

function deleteUnusedTileBuffers() {
  // TODO
}

function createTileBuffer(tileX1, tileZ1) {
  var numTriangles = TILE_AREA * 2;
  var numVertices = numTriangles * 3;
  var vertexData = new Float32Array(6 * numVertices);
  for (var dx = 0; dx < TILE_LENGTH; dx += 1) {
    var x1 = tileX1 + dx, x2 = x1 + 1;
    for (var dz = 0; dz < TILE_LENGTH; dz += 1) {
      var z1 = tileZ1 + dz, z2 = z1 + 1;
      var baseIndex = 36 * (dx * TILE_LENGTH + dz);
      var position11 = new Float32Array([x1, getHeight(x1, z1), z1]);
      var position12 = new Float32Array([x1, getHeight(x1, z2), z2]);
      var position21 = new Float32Array([x2, getHeight(x2, z1), z1]);
      var position22 = new Float32Array([x2, getHeight(x2, z2), z2]);
      addTriangleToHeightMapData(vertexData, baseIndex + 0, position11, position21, position12);
      addTriangleToHeightMapData(vertexData, baseIndex + 18, position22, position12, position21);
    }
  }

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  return buffer;
}

function addTriangleToHeightMapData(vertexData, baseIndex, a, b, c) {
  var n = normalize3(vector3CrossProduct(vector3Difference(c, a), vector3Difference(b, a)));
  triangleVertices = [a, b, c];
  for (var i = 0; i < 3; i += 1) {
    var vertex = triangleVertices[i];
    for (var j = 0; j < 3; j += 1) {
      vertexData[baseIndex + i * 6 + j] = vertex[j];
      vertexData[baseIndex + i * 6 + j + 3] = n[j];
    }
  }
}

function getShader(id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    throw new Error('No script with ID ' + id);
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    throw new Error('Unexpected script type ' + shaderScript.type);
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    throw new Error('GLSL compilation error');
  }

  return shader;
}
