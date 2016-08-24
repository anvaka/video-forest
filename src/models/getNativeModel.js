export default getNativeModel;

var bus = require('./bus.js');
var config = require('../lib/config.js');

var getRectFromName = require('./lib/getRectFromName.js');

// TODO: this probably doesn't belong here
var request = require('../lib/utils/request.js');
var binaryDecodeTree = require('./lib/binaryDumpTree.js').binaryDecodeTree;
var decodeQuadNameFromBinary = require('./lib/binaryQuadName.js').decodeQuadNameFromBinary;

var model = {
  groups: null,
  tree: null,
  links: null
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

  request(config.dataUrl + 'links.bin', {responseType: 'arraybuffer'}).then(function(l) {
    model.links = parseLinks(l);
    bus.fire('links-ready');
  });
}

export function forEachLink(nodeId, callback) {
  if (!model.links) return

  var outLinks = model.links.get(nodeId);
  if (!outLinks) return;

  outLinks.forEach(callback);
}

function parseLinks(linksBuffer) {
  var model = new Map();
  var lastArray;

  var links = new Int32Array(linksBuffer);
  for (var i = 0; i < links.length; ++i) {
    var link = links[i];
    if (link < 0) {
      var srcIndex = -link - 1;
      lastArray = [];
      model.set(srcIndex, lastArray);
    } else {
      var toNode = link - 1;
      lastArray.push(toNode);
    }
  }

  return model;
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

  root.getQuadInfo = getQuadInfo;

  return root;

  function getQuadInfo(nodePath) {
    var current = terminalTree;
    var storageFile = nodePath;
    var isTerminal = false;

    var currentName = '0';
    for (var i = 1; i < nodePath.length; ++i) {
      var quadName = nodePath[i];
      currentName += quadName;
      current = current[quadName];

      if (!current) {
        isTerminal = false;
        break;
      } // not a terminal node

      if (current.terminal) {
        // this is terminal node, and its data is stored in a different path:
        isTerminal = true;
        storageFile = currentName;
        break;
      }
    }

    return {
      name: nodePath,
      isTerminal: isTerminal,
      storageFile: storageFile,
      rect: getRectFromName(nodePath, root.rect)
    };
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
