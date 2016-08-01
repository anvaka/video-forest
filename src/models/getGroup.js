import getNativeModel from './getNativeModel.js';

module.exports = getGroup;

function getGroup(id) {
  var model = getNativeModel();
  if (model && model.groups) {
    return model.groups[id];
  }

  return 0;
}
