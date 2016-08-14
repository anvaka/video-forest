/**
 * A very basic ajax client with promises and progress reporting.
 */
var Promise = require('bluebird');

var responseCache = Object.create(null);

module.exports = request;

function request(url, options) {
  if (!options) options = {};

  var cachedResponse = responseCache[url];
  if (cachedResponse) {
    return Promise.resolve(cachedResponse);
  }

  var downloadPromise = new Promise(download);

  return downloadPromise;

  function download(resolve, reject, onCancel) {
    var req = new window.XMLHttpRequest();

    if (typeof options.progress === 'function') {
      req.addEventListener('progress', updateProgress, false);
    }

    req.addEventListener('load', transferComplete, false);
    req.addEventListener('error', transferFailed, false);
    req.addEventListener('abort', transferCanceled, false);

    req.open('GET', url);
    if (options.responseType) {
      req.responseType = options.responseType;
    }

    req.send(null);

    return;

    function updateProgress(e) {
      if (e.lengthComputable) {
        options.progress({
          loaded: e.loaded,
          total: e.total,
          percent: e.loaded / e.total
        });
      }
    }

    function transferComplete() {
      if (req.status !== 200) {
        reject(`Unexpected status code ${req.status} when calling ${url}`);
        return;
      }
      var response = req.response;

      if (options.responseType === 'json' && typeof response === 'string') {
        // IE
        response = JSON.parse(response);
      }

      responseCache[url] = response;
      resolve(response);
    }

    function transferFailed() {
      reject(`Failed to download ${url}`);
    }

    function transferCanceled() {
      reject(`Cancelled download of ${url}`);
    }
  }
}
