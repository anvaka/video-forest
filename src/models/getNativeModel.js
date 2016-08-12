export default getNativeModel;

var bus = require('./bus.js');
var config = require('../lib/config.js');

// TODO: this probably doesn't belong here
var request = require('../lib/utils/request.js');
var binaryDecodeTree = require('./lib/binaryDumpTree.js').binaryDecodeTree;
var decodeQuadNameFromBinary = require('./lib/binaryQuadName.js').decodeQuadNameFromBinary;

var model = {
  groups: null,
  tree: null
}

function getNativeModel() {
  return model
}

export function init() {
  request(config.dataUrl + 'tree/tree.bin', {responseType: 'arraybuffer'}).then(function(treeBuffer) {
    model.tree = parseTree(treeBuffer);
    bus.fire('tree-ready', model.tree);
  })

  request(config.dataUrl + 'groups.bin', {responseType: 'arraybuffer'}).then(function(g) {
    model.groups = new Int16Array(g);
    bus.fire('groups-ready');
  });
}

function parseTree(buffer) {
  var uint32Buffer = new Uint32Array(buffer, 4 * 4);
  var decoded = binaryDecodeTree(uint32Buffer);
  var rectArray = new Int32Array(buffer, 0, 4 * 4);
  var root = decoded.root;
  var terminalTree = readTerminalTree(uint32Buffer, decoded.offsetInWord)
  console.log(terminalTree);

  console.log('tree size in words:', decoded.offsetInWord, ' Array: ' + uint32Buffer.length);

  root.rect = {
    left: rectArray[0],
    top: rectArray[1],
    right: rectArray[2],
    bottom: rectArray[3]
  };

  root.getStorageFile = getStorageFile;

  return root;

  function getStorageFile(nodePath) {
    var current = terminalTree;
    var currentName = '0';
    for (var i = 1; i < nodePath.length; ++i) {
      var quadName = nodePath[i];
      currentName += quadName;
      current = current[quadName];
      if (!current) return nodePath; // not a terminal node

      if (current.terminal) {
        debugger;
        return currentName
      }
    }

    return nodePath;
  }
}

function readTerminalTree(buffer, offset) {
  var root = {};
  for (var i = offset; i < buffer.length; ++i) {
    var node = decodeQuadNameFromBinary(buffer[i])
    appendToTerminalTree(root, node);
  }

  return root;

  function appendToTerminalTree(root, node) {
    var current = root;
    for (var i = 1; i < node.length; ++i) {
      var quadName = node[i];
      if (!current[quadName]) current[quadName] = {};
      current = current[quadName];
    }

    current.terminal = true;
  }
}
