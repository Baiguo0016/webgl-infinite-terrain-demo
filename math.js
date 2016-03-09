function matrix4Zeros() {
  return new Float32Array(16);
}

function vector3Difference(a, b) {
  var difference = new Float32Array(3);
  difference[0] = a[0] - b[0];
  difference[1] = a[1] - b[1];
  difference[2] = a[2] - b[2];
  return difference;
}

function normalize3(v) {
  var m = magnitude3(v);
  return new Float32Array([v[0] / m, v[1] / m, v[2] / m]);
}

function magnitude3(v) {
  return Math.sqrt(magnitudeSquared3(v));
}

function magnitudeSquared3(v) {
  return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}

function vector3CrossProduct(a, b) {
  return new Float32Array([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
}

function matrix4Identity() {
  var m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function matrix4Product(a, b) {
  var c = new Float32Array(16);
  for (var row = 0; row < 4; row += 1) {
    for (var col = 0; col < 4; col += 1) {
      for (var i = 0; i < 4; i += 1) {
        c[col * 4 + row] += a[i * 4 + row] * b[col * 4 + i];
      }
    }
  }
  return c;
}

function matrixVector4Product(m, v) {
  var u = new Float32Array(4);
  for (var uRow = 0; uRow < 4; uRow += 1) {
    for (var mCol = 0; mCol < 4; mCol += 1) {
      u[uRow] += m[mCol * 4 + uRow] * v[mCol];
    }
  }
  return u;
}

// Linearly interpolate between a and b, giving w weight to b.
function lerp(a, b, w) {
  return (1.0 - w) * a + w * b;
}

function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}
