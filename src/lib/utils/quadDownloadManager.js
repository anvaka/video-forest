var getQuad = require('./getQuad.js');

module.exports = quadDownloadManager;

function quadDownloadManager(downloadCallback, globalTree) {
  var pendingLoad = new Map();

  return {
    queueDownload: queueDownload
  };

  function queueDownload(quadsToDownload) {
    pendingLoad.forEach(function(value, key) {
      if (!quadsToDownload.has(key)) {
        // TODO: Should I cancel xhr?
        pendingLoad.delete(key);
      }
    });

    quadsToDownload.forEach(function(quadName) {
      if (pendingLoad.has(quadName)) return;

      var quadInfo = globalTree.getQuadInfo(quadName);

      var downloadPromise = getQuad(quadInfo).then(function(points) {
        if (pendingLoad.has(quadName)) {
          pendingLoad.delete(quadName);
          downloadCallback(quadName, points);
        }
      });

      pendingLoad.set(quadName, downloadPromise);
    });
  }
}
