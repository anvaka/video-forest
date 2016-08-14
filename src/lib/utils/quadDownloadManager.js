var getQuad = require('./getQuad.js');
var findIndex = require('./findIndex.js');

module.exports = quadDownloadManager;

function quadDownloadManager(downloadCallback, globalTree) {
  var downloadStack = [];
  var pendingLoad = new Set();
  var activeDownloads = 0;
  var maxConcurrentDownloads = 4;

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

    quadsToDownload.forEach(quadName => {
      if (pendingLoad.has(quadName)) {
        moveToStackHead(quadName);
        return;
      }

      var quadInfo = globalTree.getQuadInfo(quadName);

      pendingLoad.add(quadName);
      downloadStack.push(quadInfo)
    });

    setTimeout(processNext, 0);
  }

  function processNext() {
    while (downloadStack.length > 0 && activeDownloads < maxConcurrentDownloads) {
      activeDownloads += 1;
      var quadInfo = downloadStack.pop();
      downloadQuad(quadInfo);
    }
  }

  function moveToStackHead(quadName) {
    var index = findIndex(downloadStack, quadInfo => {
      return quadInfo.name === quadName;
    });
    if (index === -1 || index === downloadStack.length - 1) return;

    var head = downloadStack[downloadStack.length - 1];
    downloadStack[downloadStack.length - 1] = downloadStack[index];
    downloadStack[index] = head;
  }

  function downloadQuad(quadInfo) {
    var quadName = quadInfo.name;

    getQuad(quadInfo).then(points => {
      if (pendingLoad.has(quadName)) {
        pendingLoad.delete(quadName);
        downloadCallback(quadName, points);
      }
    }).finally(() => {
      activeDownloads -= 1;
      setTimeout(processNext, 0);
    });
  }
}
