var _ = require('lodash');

var cleanValue = require('./cleanValue');

function getValue(string, tagName) {
  tagName = tagName == 'member' ? tagName + '(?:Of)?' : _.escapeRegExp(tagName);
  var result = _.result(RegExp('^ *\\*[\\t ]*@' + tagName + '\\s+(.+)', 'm').exec(string), 1);
  return cleanValue(result);
}

module.exports = getValue;
