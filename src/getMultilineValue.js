var _ = require('lodash');

var cleanValue = require('./cleanValue');

function getMultilineValue(string, tagName) {
  var prelude = (tagName == 'description' ? '^ */\\*\\*(?: *\\n *\\* *)?' : '^ *\\*[\\t ]*@' + _.escapeRegExp(tagName) + '\\b'),
      postlude = '(?=\\*\\s+\\@[a-z]|\\*/)',
      result = _.result(RegExp(prelude + '([\\s\\S]*?)' + postlude, 'gm').exec(string), 1);

  return result ? cleanValue(result, '\n') : '';
}

module.exports = getMultilineValue;
