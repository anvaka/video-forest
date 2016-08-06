var Promise = require('bluebird');
var request = require('../lib/utils/request.js');
var config = require('../lib/config.js');

var labelDataByFileName = Object.create(null);
const labelsPerFile = 10000; // TODO: read from graph config?

module.exports = getLabel;
var pendinRequest = 0;

function getLabel(labelIndex) {
  pendinRequest += 1;
  if (pendinRequest > 100) {
    pendinRequest = 0;
  }
  if (typeof labelIndex !== 'number') {
    return;
  }

  var labelFileName = Math.floor(labelIndex / labelsPerFile);
  var labelOffsetInFile = labelIndex % labelsPerFile;

  var cachedLabelData = labelDataByFileName[labelFileName];
  if (cachedLabelData) {
    var label = cachedLabelData[labelOffsetInFile];
    return Promise.resolve(label);
  }

  var cachedRequest = pendinRequest;

  return getLabelFile(labelFileName).then(function(data) {
    // TODO: This should be keyed by time, so that we remove old entries.
    labelDataByFileName[labelFileName] = data;
    if (pendinRequest === cachedRequest) {
      return data[labelOffsetInFile];
    }
  })
}

function getLabelFile(labelFileName) {
  var path = config.dataUrl + '/tree/labels/';
  return request(path + labelFileName + '.json', {
    responseType: 'json'
  });
}
