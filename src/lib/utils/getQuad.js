var request = require('./request');
var config = require('../config.js');
var getRectFromName = require('./getRectFromName.js');

module.exports = getQuad;

function getQuad(name, tree) {
  var storageFile = tree.getStorageFile(name);
  return request(config.dataUrl + 'tree/positions/' + storageFile + '.bin', {
    responseType: 'arraybuffer'
  }).then(function (points) {
    return parseQuad(points, name, storageFile, tree);
  });
}

function parseQuad(buffer, name, storageFile, tree) {
  var src = new Int32Array(buffer);
  var rect = getRectFromName(name, tree.rect);

  if (name === storageFile) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      points: readPoints(src, 0, src.length, name)
    };
  } else {
    throw new Error('implement me')
  }
}

function readPoints(buffer, from, to, quadName) {
  var points = [];

  for (var i = 0; i < to; i += 4) {
    var x = buffer[i + 1];
    var y = buffer[i + 2];
    var area = buffer[i + 3];
    var r = Math.sqrt(area / Math.PI);
    r = Math.max(5, r);

    points[i/4] = {
      quadName: quadName,
      id: buffer[i],
      x: x,
      y: y,
      r: r
    };
  }

  return points;
}
