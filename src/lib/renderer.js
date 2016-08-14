var THREE = require('three');
var createQuadTree = require('d3-quadtree').quadtree;
var threePanZoom = require('three.map.control');
var eventify = require('ngraph.events');
var _ = require('lodash');

var collectQuadsInVisibleRect = require('./utils/collectPaths.js');
var defaultTexture = require('./defaultTexture.js');
var rectAIntersectsB = require('./utils/rectAIntersectsB.js');
var rectAContainsB = require('./utils/rectAContainsB.js');
var getGroup = require('../models/getGroup.js');
var bus = require('../models/bus.js');
var appConfig = require('./appConfig.js');

var RENDER_QUAD_DEBUG = false;
var appendDebugQuads = require('./utils/appendDebugQuads.js');
var createDownloadManager = require('./utils/quadDownloadManager.js');

module.exports = createRenderer;

function createRenderer(container, globalTree) {
  var needsUpdate = true;
  var uniforms;
  var currentChunks = new Map();
  var tree; // rendered points quad tree, for hit test.
  var lastHover;
  var quadDownloadManager = createDownloadManager(appendQuad, globalTree);
  var updateInputQuadTreeDebounced = _.debounce(updateInputQuadTree, 400);
  var updateDataDebounced = _.throttle(downloadQuadsInVisibleArea, 400);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1500000);

  var scene = new THREE.Scene();
  scene.add(camera);

  var controls = threePanZoom(camera, container);
  controls.max = 1300000; // TODO: This should depend on rect
  updateCameraPositionFromHash()

  bus.on('groups-ready', downloadQuadsInVisibleArea);

  var visibleRect = {
    left: 0,
    top: 0,
    bottom: 0,
    right: 0
  };

  var renderer = makeThreeRenderer();

  var shaderMaterial = createParticleMaterial();

  var api = eventify({
    getVisibleRect: getVisibleRect,
    getCurrentChunks: getCurrentChunks,
    getModelPosFromScreen: getModelPosFromScreen,
    dispose: dispose
  });

  controls.on('change', updateOnMove);

  window.addEventListener('resize', onWindowResize, false);
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mousedown', onMouseDown);
  appConfig.on('positionChanged', updateCameraPositionFromHash);

  var lastFrame = window.requestAnimationFrame(frame);
  if (RENDER_QUAD_DEBUG) {
    appendDebugQuads(globalTree, scene);
  }

  updateVisibleRect();
  downloadQuadsInVisibleArea();

  return api;

  function updateCameraPositionFromHash() {
    var storedCameraPosition = appConfig.getCameraPosition()

    camera.position.x = storedCameraPosition.x
    camera.position.y = storedCameraPosition.y
    camera.position.z = storedCameraPosition.z
    needsUpdate = true
  }

  function updateOnMove() {
    needsUpdate = true;
    updateVisibleRect();
    updateDataDebounced();

    removeHover();
    appConfig.setCameraPosition(camera.position, /* silent = */ true)
  }

  function removeHover() {
    lastHover = undefined;
    api.fire('hover', undefined);
  }

  function onMouseMove(e) {
    if (!tree) return;

    var pos = getModelPosFromScreen(e.clientX, e.clientY);
    var dat = tree.find(pos.x, pos.y, 30);
    if (!dat) {
      removeHover()
      return;
    }

    if (dat !== lastHover) {
      var hoverEvent = Object.assign({
        pos: {
          x: e.clientX,
          y: e.clientY
        }
      }, dat)
      console.log(+new Date(), 'hover fire', dat)
      api.fire('hover', hoverEvent);
      lastHover = dat;
    }
  }

  function onMouseDown(e) {
    if (!tree) return;
    var pos = getModelPosFromScreen(e.clientX, e.clientY);
    var dat = tree.find(pos.x, pos.y, 30);
    if (dat) {
      removeHover();
      api.fire('click', dat);
    }
  }

  function getCurrentChunks() {
    return currentChunks;
  }

  function onWindowResize() {
    needsUpdate = true;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    uniforms.scale.value = window.innerHeight * 0.5;

    renderer.setSize(window.innerWidth, window.innerHeight);

    updateVisibleRect();
  }

  function updateVisibleRect() {
    var vFOV = camera.fov * Math.PI / 180
    var height = 2 * Math.tan( vFOV / 2 ) * camera.position.z

    var aspect = window.innerWidth / window.innerHeight
    var width = height * aspect
    var center = camera.position

    visibleRect.left = center.x - width/2;
    visibleRect.right = center.x + width/2;
    visibleRect.top = center.y - height/2;
    visibleRect.bottom = center.y + height/2;
  }

  function downloadQuadsInVisibleArea() {
    var visibleQuads = collectQuadsInVisibleRect(visibleRect, globalTree);
    visibleQuads.forEach(function(quadName) {
      if (currentChunks.has(quadName)) visibleQuads.delete(quadName)
    })

    quadDownloadManager.queueDownload(visibleQuads);
  }

  function dispose() {
    window.cancelAnimationFrame(lastFrame);
    controls.dispose();
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('mousedown', onMouseDown);
  }

  function frame(/* time */) {
    lastFrame = window.requestAnimationFrame(frame);
    if (needsUpdate) {
      renderer.render(scene, camera);
      needsUpdate = false;
    }
  }

  function getVisibleRect() {
    return visibleRect
  }

  function getModelPosFromScreen(clientX, clientY) {
    var width = visibleRect.right - visibleRect.left
    var currentScale = window.innerWidth/width

    var dx = (clientX - window.innerWidth / 2) / currentScale;
    var dy = (clientY - window.innerHeight / 2) / currentScale;

    return {
      x: camera.position.x + dx,
      y: camera.position.y - dy
    }
  }

  function appendQuad(name, chunk) {
    needsUpdate = true;

    var remove = [];
    currentChunks.forEach(function(oldChunk, name) {
      if (!rectAIntersectsB(visibleRect, oldChunk.rect) || // oldChunk is no longer visible
          rectAContainsB(oldChunk.rect, chunk) || // We've got higher-res chunk (zoom in)
          rectAContainsB(chunk, oldChunk.rect) // lower res chunk was added (zoom out)
         ) {
        remove.push(name);
        scene.remove(oldChunk.particleSystem);
        oldChunk.particleSystem.geometry.dispose();
      }
    });

    remove.forEach(function(name) {
      currentChunks.delete(name);
    });

    if (!rectAIntersectsB(visibleRect, chunk)) {
      return;
    }

    if (currentChunks.has(name)) {
      console.warn('Requested to render chunk, that is already rendered: ', name);
      return;
    }

    var points = chunk.points;

    var geometry = new THREE.BufferGeometry();
    var pointsCount = points.length;

    var positions = new Float32Array(pointsCount * 2);
    var sizes = new Float32Array(pointsCount);
    var colors = new Float32Array(pointsCount * 3);

    var theme = [0x00CFFB, 0xFF441E, 0xff9900, 0x1AF850, 0x990099, 0x0099c6, 0xdd4477, 0x66aa00, 0xb82e2e, 0x55A8F8, 0x994499, 0x22aa99, 0xaaaa11, 0x7A3FF5, 0xe67300, 0xFAA900, 0xE741EB, 0x5BFAAC, 0x5574a6, 0xFFF68C];

    points.forEach(function(p, i) {
      var idx = i * 2;
      positions[idx] = p.x;
      positions[idx + 1] = p.y;
      sizes[i] = p.r;

      var group = getGroup(p.id);
      var color = theme[group % theme.length];

      var colIdx = i * 3;
      colors[colIdx + 0] = ((color & 0xff0000) >> 16)/255;
      colors[colIdx + 1] = ((color & 0x00ff00) >> 8)/255;
      colors[colIdx + 2] = ((color & 0x0000ff) >> 0)/255
    })

    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 2));
    geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

    var particleSystem = new THREE.Points(geometry, shaderMaterial);
    particleSystem.frustumCulled = false;
    currentChunks.set(name, {
      particleSystem: particleSystem,
      rect: chunk
    });

    scene.add(particleSystem);
    updateInputQuadTreeDebounced();
  }

  function updateInputQuadTree() {
    // we build local quad tree for hit testing.
    var points = [];
    currentChunks.forEach(function(object) {
      object.rect.points.forEach(function(point) {
        points.push(point);
      });
    })

    tree = createQuadTree(points, x, y);
  }

  function vertexShader() {
    return [
      'attribute vec3 color;',
      'varying vec3 vColor;',

      'attribute float size;',
      'uniform float scale;',
      '',
      'void main() {',
      '  vColor = color;',
      '  vec4 mvPosition = modelViewMatrix * vec4( position.xy, 0.0, 1.0 );',
      '  gl_PointSize = max(1.0, size * ( scale / - mvPosition.z ));',
      '  gl_Position = projectionMatrix * mvPosition;',
      '}'
    ].join('\n');
  }

  function fragmentShader() {
    return [
      'uniform sampler2D texture;',
      'varying vec3 vColor;',
      '',
      'void main() {',
      '  vec4 tColor = texture2D( texture, gl_PointCoord );',
      '  if (tColor.a < 0.5) discard;',
      '  gl_FragColor = vec4(vColor.rgb, 1. );',
      '}'
    ].join('\n');
  }

  function createParticleMaterial() {
    uniforms = {
      scale: { value: window.innerHeight * 0.5 },
      texture: {
        type: 't',
        value: loadTexture(defaultTexture)
      }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader(),
      fragmentShader: fragmentShader(),
      transparent: true,
      depthTest: false
    });

    return material;
  }

  function makeThreeRenderer() {
    var renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    renderer.setClearColor(0x000000, 1);
    renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(renderer.domElement);

    return renderer;
  }
}

function x(p) {
  return p.x;
}

function y(p) {
  return p.y;
}

function loadTexture(path) {
  var loader = new THREE.TextureLoader();
  var texture = loader.load(path);
  return texture;
}
