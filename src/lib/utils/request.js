/**
 * A very basic ajax client with promises and progress reporting.
 */
var Promise = require('bluebird');

var responseCache = Object.create(null);

module.exports = request;

function request(url, options) {
  if (!options) options = {};
  var queue = [];
  var activeCount = 0;
  // iOS has problems with many open ajax requests, so we do not allow
  // more than 5 concurrent requests.
  var maxAllowed = 5;

  var cachedResponse = responseCache[url];
  if (cachedResponse) {
    return Promise.resolve(cachedResponse);
  }

  return new Promise(download);

  function processNext() {
    if (queue.length === 0) return;

    if (activeCount < maxAllowed) {
      var req = queue.shift();
      req.send(null);
      activeCount += 1;
    }
  }

  function download(resolve, reject) {
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

    queue.push(req);
    processNext();
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
      markActiveProcessed();

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

    function markActiveProcessed() {
      activeCount -= 1;
      window.setTimeout(processNext, 0)
    }

    function transferFailed() {
      markActiveProcessed();
      reject(`Failed to download ${url}`);
    }

    function transferCanceled() {
      markActiveProcessed();
      reject(`Cancelled download of ${url}`);
    }
  }
}
