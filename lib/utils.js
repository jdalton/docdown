'use strict';

var split = String.prototype.split;

function compareNatural(value, other) {
  var valParts = split.call(value, '.'),
      valLength = valParts.length,
      othParts = split.call(other, '.'),
      othLength = othParts.length;

  if (valLength < othLength) {
    return -1;
  } else if (valLength > othLength) {
    return 1;
  }
  var index = -1;
  while (++index < valLength) {
    var valPart = valParts[index],
        othPart = othParts[index];

    if (valPart < othPart) {
      return -1;
    } else if (valPart > othPart) {
      return 1;
    }
  }
  return 0;
}

exports.compareNatural = compareNatural;
