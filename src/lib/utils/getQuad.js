var request = require('./request');
var config = require('../config.js');
var quadNameFromBinary = require('../../models/lib/binaryQuadName.js').decodeQuadNameFromBinary;

module.exports = getQuad;

function getQuad(name, tree) {
  var quadInfo = tree.getQuadInfo(name);

  return request(config.dataUrl + 'tree/positions/' + quadInfo.storageFile + '.bin', {
    responseType: 'arraybuffer'
  }).then(function (buffer) {
    return parseQuad(buffer, quadInfo, tree);
  });
}

function parseQuad(buffer, quadInfo, tree) {
  var src = new Int32Array(buffer);
  var points;

  if (!quadInfo.isTerminal) {
    points = readPoints(src, 0, src.length, quadInfo.name)
  } else {
    var indexLength = (src[0])/4;
    // first int32 is encoded quad name, second - offset in bytes to its buffer.
    var found = false;
    // iterate over index part of the array
    for (var i = 0; i < indexLength; i += 2) {
      var recordOffset = 1 + i; // 1 - size of the index.
      var quadName = quadNameFromBinary(src[recordOffset])
      if (quadName === quadInfo.name) {
        var offset = src[recordOffset + 1];
        var arrayLength;

        if (recordOffset + 3 < indexLength) {
          var byteLength = src[recordOffset + 3] - offset
          arrayLength = byteLength / 4;
        } else {
          arrayLength = src.length - offset / 4;
        }
        points = readPoints(src, offset / 4, arrayLength, quadInfo.name);
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error('Requested quad ' + quadInfo.name + ' was not found in the file ' + quadInfo.storageFile);
    }
  }

  var rect = quadInfo.rect;

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    points: points
  };
}

function readPoints(buffer, from, length, quadName) {
  var points = [];

  for (var i = from; i < from + length; i += 4) {
    var x = buffer[i + 1];
    var y = buffer[i + 2];
    var area = buffer[i + 3];
    var r = Math.sqrt(area / Math.PI);
    r = Math.max(5, r);

    points[(i - from)/4] = {
      quadName: quadName,
      id: buffer[i],
      x: x,
      y: y,
      r: r
    };
  }

  return points;
}
