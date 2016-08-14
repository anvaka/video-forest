module.exports = function findIndex(array, predicate) {
  for (var i = 0; i < array.length; ++i) {
    if (predicate(array[i], i, array)) {
      return i;
    }
  }

  return -1;
};
