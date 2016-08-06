export default getNativeModel;

var bus = require('./bus.js');
var config = require('../lib/config.js');

// TODO: this probably doesn't belong here
var request = require('../lib/utils/request.js');

var model = {
  groups: null,
  tree: null
}

function getNativeModel() {
  return model
}

export function init() {
  request(config.dataUrl + '/tree/tree.json', {responseType: 'json'}).then(function(jsonTree) {
    model.tree = jsonTree;
    bus.fire('tree-ready', jsonTree);
  })

  request(config.dataUrl + '/groups.bin', {responseType: 'arraybuffer'}).then(function(g) {
    model.groups = new Int16Array(g);
    bus.fire('groups-ready');
  });
}
