;(function() {
  'use strict';

  var reNumberGroups = /(-?\d*\.?\d+)/g;
  var rePropertyGroups = /\./g;

  function compareNatural(a, b) {
    var isNumeric = reNumberGroups.test(a) || reNumberGroups.test(b),
        groups = isNumeric ? reNumberGroups : rePropertyGroups;

    var aa = String(a).split(groups),
        bb = String(b).split(groups),
        min = Math.min(aa.length, bb.length);

    for (var i = 0; i < min; i++) {
      var x = isNumeric ? (parseFloat(aa[i]) || aa[i].toLowerCase()) : aa[i],
          y = isNumeric ? (parseFloat(bb[i]) || bb[i].toLowerCase()) : bb[i];
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
}());
