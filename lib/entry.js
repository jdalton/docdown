'use strict';

var _ = require('lodash'),
    fp = require('lodash/fp'),
    os = require('os'),
    Alias = require('./alias.js'),
    util = require('./util.js');

/*----------------------------------------------------------------------------*/

/**
 * Gets the param type of `tag`.
 *
 * @private
 * @param {Object} tag The param tag to inspect.
 * @returns {string} Returns the param type.
 */
function getParamType(tag) {
  var expression = tag.expression,
      result = '',
      type = tag.type;

  switch (type) {
    case 'AllLiteral':
      result = '*';
      break;

    case 'NameExpression':
      result = _.toString(tag.name);
      break;

    case 'RestType':
      result = '...' + result;
      break;

    case 'TypeApplication':
      expression = undefined;
      result = _(tag)
        .chain()
        .get('applications')
        .map(_.flow(getParamType, fp.add(fp, '[]')))
        .sort(util.compareNatural)
        .join('|')
        .value();
      break;

    case 'UnionType':
      result = _(tag)
        .chain()
        .get('elements')
        .map(getParamType)
        .sort(util.compareNatural)
        .join('|')
        .value();
  }
  if (expression) {
    result += getParamType(expression);
  }
  return type == 'UnionType'
    ? ('(' + result + ')')
    : result;
}

/**
 * Gets an `entry` tag by `tagName`.
 *
 * @private
 * @param {Object} entry The entry to inspect.
 * @param {string} tagName The name of the tag.
 * @returns {null|Object} Returns the tag.
 */
function getTag(entry, tagName) {
  var parsed = entry.parsed;
  return _.find(parsed.tags, ['title', tagName]) || null;
}

/**
 * Gets an `entry` tag value by `tagName`.
 *
 * @private
 * @param {Object} entry The entry to inspect.
 * @param {string} tagName The name of the tag.
 * @returns {string} Returns the tag value.
 */
function getValue(entry, tagName) {
  var parsed = entry.parsed,
      result = parsed.description,
      tag = getTag(entry, tagName);

  if (tagName == 'alias') {
    result = _.get(tag, 'name') ;

    // Doctrine can't parse alias tags containing multiple values so extract
    // them from the error message.
    var error = _.first(_.get(tag, 'errors'));
    if (error) {
      result += error.replace(/^[^']*'|'[^']*$/g, '');
    }
  }
  else if (tagName == 'type') {
    result = _.get(tag, 'type.name');
  }
  else if (tagName != 'description') {
    result = _.get(tag, 'name') || _.get(tag, 'description');
  }
  return tagName == 'example'
    ? _.toString(result)
    : util.format(result);
}

/**
 * Checks if `entry` has a tag of `tagName`.
 *
 * @private
 * @param {Object} entry The entry to inspect.
 * @param {string} tagName The name of the tag.
 * @returns {boolean} Returns `true` if the tag is found, else `false`.
 */
function hasTag(entry, tagName) {
  return getTag(entry, tagName) !== null;
}

/*----------------------------------------------------------------------------*/

/**
 * The Entry constructor.
 *
 * @constructor
 * @param {string} entry The documentation entry to analyse.
 * @param {string} source The source code.
 * @param {string} [lang='js'] The language highlighter used for code examples.
 */
function Entry(entry, source, lang) {
  this.parsed = util.parse(entry.replace(/(\*)\/\s*.+$/, '*'));

  this.entry = entry;
  this.lang = lang == null ? 'js' : lang;
  this.source = source.replace(os.EOL, '\n');
  this.getCall = _.memoize(this.getCall);
  this.getCategory = _.memoize(this.getCategory);
  this.getDesc = _.memoize(this.getDesc);
  this.getExample = _.memoize(this.getExample);
  this.getHash = _.memoize(this.getHash);
  this.getLineNumber = _.memoize(this.getLineNumber);
  this.getName = _.memoize(this.getName);
  this.getReturns = _.memoize(this.getReturns);
  this.getSince = _.memoize(this.getSince);
  this.getType = _.memoize(this.getType);
  this.isAlias = _.memoize(this.isAlias);
  this.isCtor = _.memoize(this.isCtor);
  this.isFunction = _.memoize(this.isFunction);
  this.isLicense = _.memoize(this.isLicense);
  this.isPlugin = _.memoize(this.isPlugin);
  this.isPrivate = _.memoize(this.isPrivate);
  this.isStatic = _.memoize(this.isStatic);
  this._aliases = this._members = this._params = undefined;
}

/**
 * Extracts the documentation entries from source code.
 *
 * @static
 * @memberOf Entry
 * @param {string} source The source code.
 * @returns {Array} Returns the array of entries.
 */
function getEntries(source) {
  return _.toString(source).match(/\/\*\*(?![-!])[\s\S]*?\*\/\s*.+/g) || [];
}

/**
 * Extracts the entry's `alias` objects.
 *
 * @memberOf Entry
 * @param {number} index The index of the array value to return.
 * @returns {Array|string} Returns the entry's `alias` objects.
 */
function getAliases(index) {
  if (this._aliases === undefined) {
    var owner = this;
    this._aliases = _(getValue(this, 'alias'))
      .split(/,\s*/)
      .compact()
      .sort(util.compareNatural)
      .map(function(value) { return new Alias(value, owner); })
      .value();
  }
  var result = this._aliases;
  return index === undefined ? result : result[index];
}

/**
 * Extracts the function call from the entry.
 *
 * @memberOf Entry
 * @returns {string} Returns the function call.
 */
function getCall() {
  var result = _.trim(_.get(/\*\/\s*(?:function\s+)?([^\s(]+)\s*\(/.exec(this.entry), 1));
  if (!result) {
    result = _.trim(_.get(/\*\/\s*(.*?)[:=,]/.exec(this.entry), 1));
    result = /['"]$/.test(result)
      ? _.trim(result, '"\'')
      : result.split('.').pop().split(/^(?:const|let|var) /).pop();
  }
  var name = getValue(this, 'name') || result;
  if (!this.isFunction()) {
    return name;
  }
  var params = this.getParams();
  result = _.castArray(result);

  // Compile the function call syntax.
  _.each(params, function(param) {
    var paramValue = param[1],
        parentParam = _.get(/\w+(?=\.[\w.]+)/.exec(paramValue), 0);

    var parentIndex = parentParam == null ? -1 : _.findIndex(params, function(param) {
      return _.trim(param[1], '[]').split(/\s*=/)[0] == parentParam;
    });

    // Skip params that are properties of other params (e.g. `options.leading`).
    if (_.get(params[parentIndex], 0) != 'Object') {
      result.push(paramValue);
    }
  });

  // Format the function call.
  return name + '(' + result.slice(1).join(', ') + ')';
}

/**
 * Extracts the entry's `category` data.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's `category` data.
 */
function getCategory() {
  var result = getValue(this, 'category');
  return result || (this.getType() == 'Function' ? 'Methods' : 'Properties');
}

/**
 * Extracts the entry's description.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's description.
 */
function getDesc() {
  var type = this.getType(),
      result = getValue(this, 'description');

  return (!result || type == 'Function' || type == 'unknown')
    ? result
    : ('(' + _.trim(type.replace(/\|/g, ', '), '()') + '): ' + result);
}

/**
 * Extracts the entry's `example` data.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's `example` data.
 */
function getExample() {
  var result = getValue(this, 'example');
  return result && ('```' + this.lang + '\n' + result + '\n```');
}

/**
 * Extracts the entry's hash value for permalinking.
 *
 * @memberOf Entry
 * @param {string} [style] The hash style.
 * @returns {string} Returns the entry's hash value (without a hash itself).
 */
function getHash(style) {
  var result = _.toString(this.getMembers(0));
  if (style == 'github') {
    if (result) {
      result += this.isPlugin() ? 'prototype' : '';
    }
    result += this.getCall();
    return result
      .replace(/[\\.=|'"(){}\[\]\t ]/g, '')
      .replace(/[#,]+/g, '-')
      .toLowerCase();
  }
  if (result) {
    result += '-' + (this.isPlugin() ? 'prototype-' : '');
  }
  result += this.isAlias() ? this.getOwner().getName() : this.getName();
  return result
    .replace(/\./g, '-')
    .replace(/^_-/, '');
}

/**
 * Resolves the entry's line number.
 *
 * @memberOf Entry
 * @returns {number} Returns the entry's line number.
 */
function getLineNumber() {
  var lines = this.source
    .slice(0, this.source.indexOf(this.entry) + this.entry.length)
    .match(/\n/g)
    .slice(1);

  // Offset by 2 because the first line number is before a line break and the
  // last line doesn't include a line break.
  return lines.length + 2;
}

/**
 * Extracts the entry's `member` data.
 *
 * @memberOf Entry
 * @param {number} [index] The index of the array value to return.
 * @returns {Array|string} Returns the entry's `member` data.
 */
function getMembers(index) {
  if (this._members === undefined) {
    this._members = _(getValue(this, 'member') || getValue(this, 'memberOf'))
      .split(/,\s*/)
      .compact()
      .sort(util.compareNatural)
      .value();
  }
  var result = this._members;
  return index === undefined ? result : result[index];
}

/**
 * Extracts the entry's `name` data.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's `name` data.
 */
function getName() {
  return hasTag(this, 'name')
    ? getValue(this, 'name')
    : _.toString(_.first(this.getCall().split('(')));
}

/**
 * Extracts the entry's `param` data.
 *
 * @memberOf Entry
 * @param {number} [index] The index of the array value to return.
 * @returns {Array} Returns the entry's `param` data.
 */
function getParams(index) {
  if (this._params === undefined) {
    this._params = _(this.parsed.tags)
      .filter(['title', 'param'])
      .filter('name')
      .map(function(tag) {
        var defaultValue = tag['default'],
            desc = util.format(tag.description),
            name = _.toString(tag.name),
            type = getParamType(tag.type);

        if (defaultValue != null) {
          name += '=' + defaultValue;
        }
        if (_.get(tag, 'type.type') == 'OptionalType') {
          name = '[' + name + ']';
        }
        return [type, name,  desc];
      })
      .value();
  }
  var result = this._params;
  return index === undefined ? result : result[index];
}

/**
 * Extracts the entry's `returns` data.
 *
 * @memberOf Entry
 * @returns {array} Returns the entry's `returns` data.
 */
function getReturns() {
  var tag = getTag(this, 'returns'),
      desc = _.toString(_.get(tag, 'description')),
      type = _.toString(_.get(tag, 'type.name')) || '*';

  return tag ? [type, desc] : [];
}

/**
 * Extracts the entry's `since` data.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's `since` data.
 */
function getSince() {
  return getValue(this, 'since');
}

/**
 * Extracts the entry's `type` data.
 *
 * @memberOf Entry
 * @returns {string} Returns the entry's `type` data.
 */
function getType() {
  var result = getValue(this, 'type');
  if (!result) {
    return this.isFunction() ? 'Function' : 'unknown';
  }
  return /^(?:array|function|object|regexp)$/.test(result)
    ? _.capitalize(result)
    : result;
}

/**
 * Checks if the entry is an alias.
 *
 * @memberOf Entry
 * @type {Function}
 * @returns {boolean} Returns `false`.
 */
var isAlias = _.constant(false);

/**
 * Checks if the entry is a constructor.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if a constructor, else `false`.
 */
function isCtor() {
  return hasTag(this, 'constructor');
}

/**
 * Checks if the entry is a function reference.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if the entry is a function reference, else `false`.
 */
function isFunction() {
  return !!(
    this.isCtor() ||
    _.size(this.getParams()) ||
    _.size(this.getReturns()) ||
    hasTag(this, 'function') ||
    /\*\/\s*(?:function\s+)?[^\s(]+\s*\(/.test(this.entry)
  );
}

/**
 * Checks if the entry is a license.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if a license, else `false`.
 */
function isLicense() {
  return hasTag(this, 'license');
}

/**
 * Checks if the entry *is* assigned to a prototype.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if assigned to a prototype, else `false`.
 */
function isPlugin() {
  return (
    !this.isCtor() &&
    !this.isPrivate() &&
    !this.isStatic()
  );
}

/**
 * Checks if the entry is private.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if private, else `false`.
 */
function isPrivate() {
  return (
    this.isLicense() ||
    hasTag(this, 'private') ||
    _.isEmpty(this.parsed.tags)
  );
}

/**
 * Checks if the entry is *not* assigned to a prototype.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if not assigned to a prototype, else `false`.
 */
function isStatic() {
  var isPublic = !this.isPrivate(),
      result = isPublic && hasTag(this, 'static');

  // Get the result in cases where it isn't explicitly stated.
  if (isPublic && !result) {
    var parent = _.last(_.toString(this.getMembers(0)).split(/[#.]/));
    if (!parent) {
      return true;
    }
    var source = this.source;
    _.each(getEntries(source), function(entry) {
      entry = new Entry(entry, source);
      if (entry.getName() == parent) {
        result = !entry.isCtor();
        return false;
      }
    });
  }
  return result;
}

/*----------------------------------------------------------------------------*/

Entry.getEntries = getEntries;

_.assign(Entry.prototype, {
  'getAliases': getAliases,
  'getCall': getCall,
  'getCategory': getCategory,
  'getDesc': getDesc,
  'getExample': getExample,
  'getHash': getHash,
  'getLineNumber': getLineNumber,
  'getMembers': getMembers,
  'getName': getName,
  'getParams': getParams,
  'getReturns': getReturns,
  'getSince': getSince,
  'getType': getType,
  'isAlias': isAlias,
  'isCtor': isCtor,
  'isFunction': isFunction,
  'isLicense': isLicense,
  'isPlugin': isPlugin,
  'isPrivate': isPrivate,
  'isStatic': isStatic
});

module.exports = Entry;
