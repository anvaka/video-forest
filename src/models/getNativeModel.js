export default getNativeModel;

var bus = require('./bus.js');
var config = require('../lib/config.js');

// TODO: this probably doesn't belong here
var request = require('../lib/utils/request.js');
var binaryDecodeTree = require('./lib/binaryDumpTree.js').binaryDecodeTree;

var model = {
  groups: null,
  tree: null
}

function getNativeModel() {
  return model
}

export function init() {
  request(config.dataUrl + '/tree/tree.bin', {responseType: 'arraybuffer'}).then(function(treeBuffer) {
    model.tree = parseTree(treeBuffer);
    bus.fire('tree-ready', model.tree);
  })

  request(config.dataUrl + '/groups.bin', {responseType: 'arraybuffer'}).then(function(g) {
    model.groups = new Int16Array(g);
    bus.fire('groups-ready');
  });
}

function parseTree(buffer) {
  var root = binaryDecodeTree(new Uint32Array(buffer, 4 * 4));
  var rectArray = new Int32Array(buffer, 0, 4 * 4);

  root.rect = {
    left: rectArray[0],
    top: rectArray[1],
    right: rectArray[2],
    bottom: rectArray[3]
  };

  return root;
}
