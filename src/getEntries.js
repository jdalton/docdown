/**
 * Extracts the documentation entries from source code.
 *
 * @static
 * @memberOf Entry
 * @param {string} source The source code.
 * @returns {Array} The array of entries.
 */
function getEntries(source) {
  return source.match(/\/\*\*(?![-!])[\s\S]*?\*\/\s*.+/g) || [];
}

module.exports = getEntries;
