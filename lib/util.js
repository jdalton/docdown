'use strict';
var _ = require('lodash'),
    doctrine = require('doctrine');

var split = String.prototype.split;

function compareNatural(value, other) {
  var index = -1,
      valParts = split.call(value, '.'),
      valLength = valParts.length,
      othParts = split.call(other, '.'),
      othLength = othParts.length,
      length = Math.min(valLength, othLength);

  while (++index < length) {
    var valPart = valParts[index],
        othPart = othParts[index];

    if (valPart > othPart && othPart != 'prototype') {
      return 1;
    } else if (valPart < othPart && valPart != 'prototype') {
      return -1;
    }
  }
  return valLength > othLength ? 1 : (valLength < othLength ? -1 : 0);
}

var parse = _.partial(doctrine.parse, _, {
  'lineNumbers': true,
  'recoverable': true,
  'sloppy': true,
  'unwrap': true
});

module.exports = {
  'compareNatural': compareNatural,
  'parse': parse
};
