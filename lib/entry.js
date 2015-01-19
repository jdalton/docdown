'use strict';

var _ = require('lodash'),
    os = require('os'),
    Alias = require('./alias.js'),
    utils = require('./utils.js');

/*----------------------------------------------------------------------------*/

function cleanValue(string) {
  string = string == null ? '' : String(string);
  return _.trim(string.replace(/(?:^|\n)[\t ]*\*[\t ]*/g, ' '));
}

function getMultilineValue(string, tagName) {
  var prelude = tagName == 'description' ? '^ */\\*\\*(?: *\\n *\\* *)?' : ('^ *\\*[\\t ]*@' + _.escapeRegExp(tagName) + '\\b'),
      postlude = '(?=\\*\\s+\\@[a-z]|\\*/)',
      result = _.result(RegExp(prelude + '([\\s\\S]*?)' + postlude, 'gm').exec(string), 1, '');

  return _.trim(result.replace(RegExp('(?:^|\\n)[\\t ]*\\*[\\t ]' + (tagName == 'example' ? '?' : '*'), 'g'), '\n'));
}

function getValue(string, tagName) {
  tagName = tagName == 'member' ? (tagName + '(?:Of)?') : _.escapeRegExp(tagName);
  var result = _.result(RegExp('^ *\\*[\\t ]*@' + tagName + '\\s+(.+)', 'm').exec(string), 1, '');
  return cleanValue(result);
}

function hasTag(string, tagName) {
  tagName = tagName == '*' ? '\\w+' : _.escapeRegExp(tagName);
  return RegExp('^ *\\*[\\t ]*@' + tagName + '\\b', 'm').test(string);
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
  this.entry = entry;
  this.lang = lang == null ? 'js' : lang;
  this.source = source.replace(os.EOL, "\n");
}

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

/**
 * Extracts the entry's `alias` objects.
 *
 * @memberOf Entry
 * @param {number} index The index of the array value to return.
 * @returns {Array|string} The entry's `alias` objects.
 */
function getAliases(index) {
  if (this._aliases === undefined) {
    var result = _.result(/\*[\t ]*@alias\s+(.+)/.exec(this.entry), 1);
    if (result) {
      result = result.replace(/(?:^|\n)[\t ]*\*[\t ]*/, ' ').trim();
      result = result.split(/,\s*/);
      result.sort(utils.compareNatural);

      result = _.map(result, function(value) {
        return new Alias(value, this);
      }, this);
    }
    this._aliases = result;
  }
  return index !== undefined
    ? this._aliases[index]
    : this._aliases;
}

/**
 * Extracts the function call from the entry.
 *
 * @memberOf Entry
 * @returns {string} The function call.
 */
function getCall() {
  if (this._call !== undefined) {
    return this._call;
  }
  var result = /\*\/\s*(?:function ([^(]*)|(.*?)(?=[:=,]|return\b))/.exec(this.entry);
  if (result) {
    result = (result[1] || result[2]).split('.').pop();
    result = _.trim(_.trim(result), "'").split('var ').pop();
    result = _.trim(result);
  }
  // resolve name
  // avoid this.getName() because it calls this.getCall()
  var name = _.result(/\*[\t ]*@name\s+(.+)/.exec(this.entry), 1) || result;

  // compile function call syntax
  if (this.isFunction()) {
    var params = this.getParams(),
        paramNames = [];

    // compose parts
    result = [result];
    _.each(params, function(param) {
      // skip params that are properties of other params (e.g. `options.leading`)
      var parentParam = _.result(/\w+(?=\.[\w.]+)/.exec(param[1]), 0);
      if (!_.contains(paramNames, parentParam)) {
        result.push(param[1]);
      }
      paramNames.push(param[1].replace(/^\[|\]/, ''));
    });
    // format
    result = name + '(' + result.slice(1).join(', ') + ')';
  }
  this._call = result ? result : name;
  return this._call;
}

/**
 * Extracts the entry's `category` data.
 *
 * @memberOf Entry
 * @returns {string} The entry's `category` data.
 */
function getCategory() {
  if (this._category !== undefined) {
    return this._category;
  }
  var result = _.result(/\*[\t ]*@category\s+(.+)/.exec(this.entry), 1, '');
  if (result) {
    result = cleanValue(result);
  } else {
    result = this.getType() == 'Function' ? 'Methods' : 'Properties';
  }
  this._category = result;
  return result;
}

/**
 * Extracts the entry's description.
 *
 * @memberOf Entry
 * @returns {string} The entry's description.
 */
function getDesc() {
  if (this._desc !== undefined) {
    return this._desc;
  }
  var result = getMultilineValue(this.entry, 'description');
  if (result) {
    result = result
      .replace(/:\n[\t ]*\*[\t ]*/g, ':<br>\n')
      .replace(/(?:^|\n)[\t ]*\*\n[\t ]*\*[\t ]*/g, '\n\n')
      .replace(/(?:^|\n)[\t ]*\*[\t ]?/g, ' ')
      .trim();

    var type = this.getType();
    if (type != 'unknown') {
      result = (type == 'Function' ? '' : '(' + type.replace(/\|/g, ', ') + '): ') + result;
    }
  }
  this._desc = result;
  return result;
}

/**
 * Extracts the entry's `example` data.
 *
 * @memberOf Entry
 * @returns {string} The entry's `example` data.
 */
function getExample() {
  if (this._example != null) {
    return this._example;
  }
  var result = getMultilineValue(this.entry, 'example');
  if (result) {
    result = '```' + this.lang + '\n' + result + '\n```';
  }
  this._example = result;
  return result;
}

/**
 * Checks if the entry is an alias.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `false`.
 */
function isAlias() {
  return false;
}

/**
 * Checks if the entry is a constructor.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if a constructor, else `false`.
 */
function isCtor() {
  if (this._isCtor === undefined) {
    this._isCtor = hasTag(this.entry, 'constructor');
  }
  return this._isCtor;
}

/**
 * Checks if the entry is a function reference.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if the entry is a function reference, else `false`.
 */
function isFunction() {
  if (this && this._isFunction === undefined) {
    this._isFunction = !!(
      this.isCtor() ||
      _.size(this.getParams()) ||
      _.size(this.getReturns()) ||
      /\*[\t ]*@function\b/.test(this.entry) ||
      /\*\/\s*function/.test(this.entry)
    );
  }
  return (this ? this._isFunction : false);
}

/**
 * Checks if the entry is a license.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if a license, else `false`.
 */
function isLicense() {
  if (this._isLicense === undefined) {
    this._isLicense = hasTag(this.entry, 'license');
  }
  return this._isLicense;
}

/**
 * Checks if the entry *is* assigned to a prototype.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if assigned to a prototype, else `false`.
 */
function isPlugin() {
  if (this._isPlugin === undefined) {
    this._isPlugin = (
      (!this.isCtor()) &&
      (!this.isPrivate()) &&
      (!this.isStatic()));
  }
  return this._isPlugin;
}

/**
 * Checks if the entry is private.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if private, else `false`.
 */
function isPrivate() {
  if (this._isPrivate === undefined) {
    this._isPrivate = (
      this.isLicense() ||
      hasTag(this.entry, 'private') ||
      !hasTag(this.entry, '*')
    );
  }
  return this._isPrivate;
}

/**
 * Checks if the entry is *not* assigned to a prototype.
 *
 * @memberOf Entry
 * @returns {boolean} Returns `true` if not assigned to a prototype, else `false`.
 */
function isStatic() {
  if (this._isStatic !== undefined) {
    return this._isStatic;
  }
  var isPublic = !this.isPrivate(),
      result = isPublic && hasTag(this.entry, 'static');

  // set in cases where it isn't explicitly stated
  if (isPublic && !result) {
    var parent = _.last((this.getMembers(0) || '').split(/[#.]/));
    if (parent) {
      var source = this.source;
      _.each(getEntries(source), function(entry) {
        entry = new Entry(entry, source);
        if (entry.getName() == parent) {
          result = !entry.isCtor();
          return false;
        }
      });
    } else {
      result = true;
    }
  }
  this._isStatic = result;
  return result;
}

/**
 * Resolves the entry's line number.
 *
 * @memberOf Entry
 * @returns {number} The entry's line number.
 */
function getLineNumber() {
  if (this._lineNumber === undefined) {
    var entry = this.entry,
        lines = this.source.slice(0, this.source.indexOf(entry) + entry.length).match(/\n/g).slice(1);

    this._lineNumber = lines.length + 1;
  }
  return this._lineNumber;
}

/**
 * Extracts the entry's `member` data.
 *
 * @memberOf Entry
 * @param {number} [index] The index of the array value to return.
 * @returns {Array|string} The entry's `member` data.
 */
function getMembers(index) {
  if (this._members === undefined) {
    var result = getValue(this.entry, 'member');
    if (result) {
      result = result.split(/,\s*/);
      result.sort(utils.compareNatural);
    }
    this._members = result || [];
  }
  return index !== undefined
    ? this._members[index]
    : this._members;
}

/**
 * Extracts the entry's `name` data.
 *
 * @memberOf Entry
 * @returns {string} The entry's `name` data.
 */
function getName() {
  if (this._name === undefined) {
    this._name = hasTag(this.entry, 'name')
      ? getValue(this.entry, 'name')
      : (this.getCall() ? _.first(this.getCall().split('('))  : undefined);

    if (this._name) {
      this._name = this._name.replace(/\'/g,'');
    }
  }
  return this._name;
}

/**
 * Extracts the entry's `param` data.
 *
 * @memberOf Entry
 * @param {number} [index] The index of the array value to return.
 * @returns {Array} The entry's `param` data.
 */
function getParams(index) {
  if (this._params === undefined) {
    var match,
        re = /@param\s+\{\(?([^})]+)\)?\}\s+(\[.+\]|[\w]+(?:\[.+\])?)\s+([\s\S]*?)(?=\@)/gim,
        result = [];

    while (match = re.exec(this.entry)) {
      match = match.slice(1);
      match = match.map(function(aParamPart,index) {
        return aParamPart.trim()
      });
      match[2] = match[2].replace(/(?:^|\n)[\t ]*\*[\t ]*/g, ' ');
      result.push(match);
    }
    var tuples = match ? _.compact(match) : [];
    _.each(tuples, function(tuple){
      result.push(tuple.trim());
    });

    this._params = result;
  }
  return index !== undefined
    ? this._params[index]
    : this._params;
}

/**
 * Extracts the entry's `returns` data.
 *
 * @memberOf Entry
 * @returns {array} The entry's `returns` data.
 */
function getReturns() {
  if (this._returns !== undefined) {
    return this._returns;
  }
  var result = getMultilineValue(this.entry, 'returns'),
      returnType = _.result(/(?:\{)([\w|\*]*)(?:\})/gi.exec(result),1);

  if (returnType) {
    this._returns = [returnType,result.replace(/(\{[\w|\*]*\})/gi,'')];
  } else {
    this._returns = [];
  }
  return this._returns;
}

/**
 * Extracts the entry's `type` data.
 *
 * @memberOf Entry
 * @returns {string} The entry's `type` data.
 */
function getType() {
  if (this._type === undefined) {
    var result = getValue(this.entry, 'type');
    if (result) {
      if (/^(?:array|function|object|regexp)$/.test(result)) {
        result = _.capitalize(result);
      }
    } else {
      result = isFunction(this) ? 'Function' : 'unknown';
    }
    this._type = result;
  }
  return this._type;
}

/**
 * Extracts the entry's hash value for permalinking.
 *
 * @memberOf Entry
 * @param {string} [style] The hash style.
 * @returns {string} The entry's hash value (without a hash itself).
 */
function getHash(style) {
  switch (style) {
    case 'github':
      return this.getCall()
        .replace(/\(\[|\[\]/g, '')
        .replace(/[\t =|\'"{}.()\]]/g, '')
        .replace(/[\[#,]+/g, '-')
        .toLowerCase();
  }
  var result = this.getMembers(0) || '';
  if (result) {
    result += '_' + (this.isPlugin() ? 'prototype_' : '');
  }
  result += this.isAlias() ? this.getOwner().getName() : this.getName();
  return result
    .replace(/\./g, '_')
    .replace(/^_+/, '');
}

/*----------------------------------------------------------------------------*/

Entry.getEntries = getEntries;

_.assign(Entry.prototype, {
  'getAliases': getAliases,
  'getCall': getCall,
  'getCategory': getCategory,
  'getDesc': getDesc,
  'getExample': getExample,
  'isAlias': isAlias,
  'isCtor': isCtor,
  'isLicense': isLicense,
  'isPlugin': isPlugin,
  'isPrivate': isPrivate,
  'isFunction': isFunction,
  'isStatic': isStatic,
  'getLineNumber': getLineNumber,
  'getMembers': getMembers,
  'getName': getName,
  'getParams': getParams,
  'getReturns': getReturns,
  'getType': getType,
  'getHash': getHash
});

module.exports = Entry;
