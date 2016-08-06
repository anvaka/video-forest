/**
 * Allows to render quadtree that was constructed by dumpTree.js utility
 */
module.exports = appendDebugQuads;
var THREE = require('three');

function appendDebugQuads(tree, scene) {
  var jsPos = [];
  var maxDepth = 6;
  var rect = tree.rect;

  appendLayer(tree, rect, 0);

  var geometry = new THREE.BufferGeometry();
  var material = new THREE.LineBasicMaterial();

  var positions = new Float32Array(jsPos);
  geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

  geometry.computeBoundingSphere();
  var linkMesh = new THREE.Line(geometry, material, THREE.LinePieces);
  scene.add(linkMesh);

  return;

  function appendLayer(quad, rect, currentDepth) {
    addRect(rect);
    var {children} = quad;
    if (!children || currentDepth > maxDepth) return;

    if (children[0]) {
      appendLayer(children[0], {
        left: rect.left,
        right: (rect.left + rect.right)/2,
        top: rect.top,
        bottom: (rect.top + rect.bottom)/2
      }, currentDepth + 1)
    }
    if (children[1]) {
      appendLayer(children[1], {
        left: (rect.left + rect.right)/2,
        right: rect.right,
        top: rect.top,
        bottom: (rect.top + rect.bottom)/2
      }, currentDepth + 1)
    }
    if (children[2]) {
      appendLayer(children[2], {
        left: rect.left,
        right: (rect.left + rect.right)/2,
        top: (rect.top + rect.bottom)/2,
        bottom: rect.bottom
      }, currentDepth + 1)
    }
    if (children[3]) {
      appendLayer(children[3], {
        left: (rect.left + rect.right)/2,
        right: rect.right,
        top: (rect.top + rect.bottom)/2,
        bottom: rect.bottom
      }, currentDepth + 1)
    }
  }

  function addRect(rect) {
    jsPos.push(
      rect.left, rect.top, 0, // x, y, z
      rect.left, rect.bottom, 0,

      rect.left, rect.bottom, 0,
      rect.right, rect.bottom, 0,

      rect.right, rect.bottom, 0,
      rect.right, rect.top, 0,

      rect.right, rect.top, 0,
      rect.left, rect.top, 0 // x, y, z
    )
  }
}
