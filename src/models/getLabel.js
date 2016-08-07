import getNativeModel from './getNativeModel.js';

var Promise = require('bluebird');
var request = require('../lib/utils/request.js');
var config = require('../lib/config.js');

// TODO: This should be keyed by time, so that we remove old entries.
var labelDataByQuadName = Object.create(null);

module.exports = getLabel;
var pendingRequestId = 0;

function getLabel(parsedQuad) {
  var tree = getNativeModel().tree
  if (!tree) {
    return Promise.reject('Tree index is not loaded yet');
  }

  pendingRequestId += 1;
  if (pendingRequestId > 100) {
    pendingRequestId = 0;
  }

  var quadName = parsedQuad.quadName;
  if (quadName === undefined) {
    console.error(parsedQuad);
    throw new Error('Missing quad name for quad');
  }

  var cachedLabelData = labelDataByQuadName[quadName];
  if (cachedLabelData) {
    return resolveLabelInQuad(parsedQuad.id, cachedLabelData);
  }

  var previousRequestId = pendingRequestId;

  return getLabelFile(quadName).then(function(pointIdToLabelId) {
    labelDataByQuadName[quadName] = pointIdToLabelId;
    if (pendingRequestId === previousRequestId) {
      return resolveLabelInQuad(parsedQuad.id, pointIdToLabelId);
    }
  })

  function resolveLabelInQuad(pointId, pointIdToLabelId) {
    if (!pointIdToLabelId.hasOwnProperty(pointId)) {
      throw new Error('Quad does not have ' + pointId);
    }
    var label = pointIdToLabelId[pointId];
    return Promise.resolve(label);
  }
}

function getLabelFile(labelFileName) {
  var path = config.dataUrl + '/tree/labels/';
  return request(path + labelFileName + '.json', {
    responseType: 'json'
  });
}
