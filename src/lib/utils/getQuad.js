var request = require('./request');
var config = require('../config.js');
var getRectFromName = require('./getRectFromName.js');

module.exports = getQuad;

function getQuad(name, tree) {
  return request(config.dataUrl + 'tree/positions/' + name + '.bin', {
    responseType: 'arraybuffer'
  }).then(function (points) {
    return parseQuad(points, name, tree);
  });
}

function parseQuad(buffer, name, tree) {
  var src = new Int32Array(buffer);
  var points = [];

  for (var i = 0; i < src.length; i += 4) {
    var x = src[i + 1];
    var y = src[i + 2];
    var area = src[i + 3];
    var r = Math.sqrt(area / Math.PI);
    r = Math.max(5, r);

    points[i/4] = {
      quadName: name,
      id: src[i],
      x: x,
      y: y,
      r: r
    };
  }

  var rect = getRectFromName(name, tree.rect);

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    points: points
  };
}
