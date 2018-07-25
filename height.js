function getHeightInt(x, z) {
  //return perlin(x, z);
  return midpointDisplacement(x, z);
}

function getHeight(x, z) {
  //return perlin(x, z);
  return getHeightInterpolating(x, z);
}

function getHeightInterpolating(x, z) {
  var x1 = Math.floor(x), x2 = Math.ceil(x),
      z1 = Math.floor(z), z2 = Math.ceil(z);

  if (x == x1 && z == z1) {
    return getHeightInt(x, z);
  }

  var h11 = getHeightInt(x1, z1),
      h12 = getHeightInt(x1, z2),
      h21 = getHeightInt(x2, z1),
      h22 = getHeightInt(x2, z2);

  var dx1 = x - x1, dx2 = x2 - x,
      dz1 = z - z1, dz2 = z2 - z;

  // Bilinear interpolation
  return h11 * dx2 * dz2
       + h12 * dx2 * dz1
       + h21 * dx1 * dz2
       + h22 * dx1 * dz1;
}

var VOXEL_BITS = 6;
var VOXEL_SIZE = Math.pow(2, VOXEL_BITS);

function randomOffset(x, z, scale) {
  var seed = x * VOXEL_SIZE + z;
  var rand = seed * 10301 % 1000 / 1000;
  return scale * (rand - 0.5);
}

function midpointDisplacement(x, z) {
  x = (x % VOXEL_SIZE + VOXEL_SIZE) % VOXEL_SIZE;
  z = (z % VOXEL_SIZE + VOXEL_SIZE) % VOXEL_SIZE;

  if (x == 0 && z == 0) {
    return randomVoxelCorner(x, z);
  }

  var xFactorsOfTwo = countFactorsOfTwo(x),
      zFactorsOfTwo = countFactorsOfTwo(z);

  if (xFactorsOfTwo == zFactorsOfTwo) {
    // (x, z) is a center point, i.e. it has four parent vertices.
    var delta = Math.pow(2, xFactorsOfTwo);
    var sum = midpointDisplacement(x, z - delta)
            + midpointDisplacement(x, z + delta)
            + midpointDisplacement(x - delta, z)
            + midpointDisplacement(x + delta, z);
    var average = sum / 4;
    var offset = randomOffset(x, z, delta);
    return average + offset;
  } else {
    // (x, z) is a midpoint, i.e. it has two parent vertices.
    // Which axis do we traverse to find its parent vertices?
    var parentsAlongX;
    if (x == 0) {
      parentsAlongX = false;
    } else if (z == 0) {
      parentsAlongX = true;
    } else {
      parentsAlongX = xFactorsOfTwo < zFactorsOfTwo;
    }

    if (parentsAlongX) {
      var dx = Math.pow(2, xFactorsOfTwo);
      var x1 = x - dx, x2 = x + dx;
      var average = (midpointDisplacement(x1, z) + midpointDisplacement(x2, z)) / 2;
      var offset = randomOffset(x, z, dx);
      return average + offset;
    } else {
      var dz = Math.pow(2, zFactorsOfTwo);
      var z1 = z - dz, z2 = z + dz;
      var average = (midpointDisplacement(x, z1) + midpointDisplacement(x, z2)) / 2;
      var offset = randomOffset(x, z, dz);
      return average + offset;
    }
  }
}

function diamondSquares(x, z) {
  x = (x % VOXEL_SIZE + VOXEL_SIZE) % VOXEL_SIZE;
  z = (z % VOXEL_SIZE + VOXEL_SIZE) % VOXEL_SIZE;

  ;
}

/**
 * Counts a number's factors of two. Equivalently, if we consider the binary
 * encoding of the given number, this counts the number of 0 bits after the
 * least significant 1 bit.
 *
 * For the special case of zero, this returns -1.
 */
function countFactorsOfTwo(n) {
  if (n == 0) {
    return -1;
  }

  var count = 0;
  while (n % 2 == 0) {
    n >>>= 1;
    ++count;
  }
  return count;
}

function isCenterPoint(x, z) {
  if (x == 0 || z == 0) {
      return false;
  }

  return countFactorsOfTwo(x) == countFactorsOfTwo(z);
}

function randomVoxelCorner(x, z) {
  return 0; // TODO use interesting corners?

  Math.seedrandom([x, z]);
  return 64 * (Math.random() - 0.5);
}

function perlin(x, z) {
  return 4 * perlinLayer(x / 8, z / 8)
       + 8 * perlinLayer(x / 16, z / 16)
       + 16 * perlinLayer(x / 32, z / 32)
       + 32 * perlinLayer(x / 64, z / 64)
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
