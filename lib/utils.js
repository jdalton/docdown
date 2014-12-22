'use strict';

var rePropertyGroups = /\./g;

function compareNatural(a, b) {
  var aa = String(a).split(rePropertyGroups),
      bb = String(b).split(rePropertyGroups),
      min = Math.min(aa.length, bb.length);

  for (var i = 0; i < min; i++) {
    var x = aa[i],
        y = bb[i];
    if (x < y) {
      return -1;
    } else if (x > y) {
      return 1;
    }
  }

  if (aa.length < bb.length) {
    return -1;
  } else if (aa.length > bb.length) {
    return 1;
  }
  return 0;
}

exports.compareNatural = compareNatural;
