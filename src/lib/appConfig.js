var eventify = require('ngraph.events');
var qs = require('qs');
var _ = require('lodash');

var defaultConfig = {
  pos: {x: 0, y: 0, z: 1300000}
}

module.exports = appConfig();

function appConfig() {
  var hashConfig = parseFromHash(window.location.hash);
  var updateHashDebounced = _.debounce(updateHash, 400);

  var api = {
    getCameraPosition: getCameraPosition,
    setCameraPosition: setCameraPosition
  }

  eventify(api)

  window.addEventListener('hashchange', onHashChange, false);

  return api;

  function onHashChange(h) {
    var newHash = parseFromHash(window.location.hash)
    var positionChanged = !same(hashConfig.pos, newHash.pos)
    hashConfig = newHash;

    if (positionChanged) api.fire('positionChanged', hashConfig.pos)
  }

  function getCameraPosition() {
    return hashConfig.pos;
  }

  function setCameraPosition(pos, silent) {
    if (same(pos, hashConfig.pos)) return;

    hashConfig.pos.x = pos.x;
    hashConfig.pos.y = pos.y;
    hashConfig.pos.z = pos.z;

    updateHashDebounced()

    if (!silent) {
      api.fire('positionChanged', hashConfig.pos)
    }
  }

  function updateHash() {
    var pos = hashConfig.pos;
    var hash = '#/'+ '?cx=' + Math.round(pos.x) + '&cy=' + Math.round(pos.y) + '&cz=' + Math.round(pos.z);

    setHash(hash);
  }

  function setHash(hash) {
    window.history.replaceState(undefined, undefined, hash);
  }

  function parseFromHash(hash) {
    if (!hash) {
      return defaultConfig;
    }

    var query = qs.parse(hash.split('?')[1]);

    var pos = {
      x: query.cx || 0,
      y: query.cy || 0,
      z: query.cz || 0
    };

    return {
      pos: normalize(pos)
    };
  }
}

function normalize(v) {
  if (!v) return v;
  v.x = getNumber(v.x);
  v.y = getNumber(v.y);
  v.z = getNumber(v.z);
  return v;
}

function getNumber(x, defaultValue) {
  if (defaultValue === undefined) defaultValue = 0;

  x = parseFloat(x);
  if (isNaN(x)) return defaultValue;
  return x;
}

function same(v1, v2) {
  if (!v1 || !v2) return false;
  return v1.x === v2.x &&
          v1.y === v2.y &&
          v1.z === v2.z;
}
