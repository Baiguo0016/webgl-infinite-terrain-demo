// This is Ken Perlin's "smootherstep" function, whose first and second
// derivatives both have endpoints at zero.
function smootherstep(edge0, edge1, x) {
  // Scale, and clamp x to [0..1] range.
  var x = clamp((x - edge0)/(edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function dotGridGradient(ix, iz, x, z) {
  var dx = x - ix;
  var dz = z - iz;
  var gradientAngle = getPseudorandomAngle(ix, iz);
  return dx * Math.cos(gradientAngle) + dz * -Math.sin(gradientAngle);
}

function getPseudorandomAngle(ix, iz) {
  var x = (Math.sin(ix) + Math.cos(iz)) * 10000;
  return 2 * Math.PI * (x - Math.floor(x));
}

function perlinLayer(x, z) {
  var x0 = Math.floor(x), x1 = x0 + 1;
  var z0 = Math.floor(z), z1 = z0 + 1;
  var sx = smootherstep(x0, x1, x);
  var sz = smootherstep(z0, z1, z);

  var n0 = dotGridGradient(x0, z0, x, z);
  var n1 = dotGridGradient(x1, z0, x, z);
  var ix0 = lerp(n0, n1, sx);
  n0 = dotGridGradient(x0, z1, x, z);
  n1 = dotGridGradient(x1, z1, x, z);
  var ix1 = lerp(n0, n1, sx);

  return lerp(ix0, ix1, sz);
}

function perlin(x, z) {
  return 4 * perlinLayer(x / 8, z / 8)
       + 8 * perlinLayer(x / 16, z / 16)
       + 16 * perlinLayer(x / 32, z / 32)
       + 32 * perlinLayer(x / 64, z / 64)
}

function getHeight(x, z) {
  return perlin(x, z);
}
