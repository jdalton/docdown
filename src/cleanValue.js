var _ = require('lodash');

function cleanValue(string, replacer) {
  replacer = replacer || ' ';
  string = string == null ? '' : String(string);
  return string && _.trim(string.replace(/(?:^|\n)[\t ]*\*[\t ]*/g, replacer));
}

module.exports = cleanValue;
