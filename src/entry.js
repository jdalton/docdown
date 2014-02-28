;(function() {
  'use strict';

  var _ = require('lodash'),
      os = require('os'),
      Alias = require('./alias.js');

  var NUMBER_GROUPS = /(-?\d*\.?\d+)/g;

  /*--------------------------------------------------------------------------*/

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

  /*--------------------------------------------------------------------------*/

  function cleanValue(string) {
    string = string == null ? '' : String(string);
    return string && _.trim(string.replace(/(?:^|\n)[\t ]*\*[\t ]*/g, ' '));
  }

  function compareNatural(a, b) {
    var aa = String(a).split(NUMBER_GROUPS),
        bb = String(b).split(NUMBER_GROUPS),
        min = Math.min(aa.length, bb.length);

    for (var i = 0; i < min; i++) {
      var x = parseFloat(aa[i]) || aa[i].toLowerCase(),
          y = parseFloat(bb[i]) || bb[i].toLowerCase();
      if (x < y) return -1;
      else if (x > y) return 1;
    }

    return 0;
  }

  function getMultilineValue(string, tagName) {
    var prelude = (name == 'description' ? '^ */\\*\\*(?: *\\n *\\* *)?' : '^ *\\*[\\t ]*@' + escapeRegExp(tagName) + '\\b'),
        postlude = '(?=\\*\\s+\\@[a-z]|\\*/)',
        result = _.result(RegExp(prelude + '([\\s\\S]*?)' + postlude, 'gm').exec(string), 1);

    return result ? _.trim(result.replace(/(?:^|\n)[\t ]*\*[\t ]*/g, '\n')) : '';
  }

  function getValue(string, tagName) {
    tagName = tagName == 'member' ? tagName + '(?:Of)?' : escapeRegExp(tagName);
    var result = _.result(RegExp('^ *\\*[\\t ]*@' + tagName + '\\s+(.+)', 'm').exec(string), 1);
    return cleanValue(result);
  }

  function hasTag(string, tagName) {
    tagName = tagName == '*' ? '\\w+' : escapeRegExp(tagName);
    return RegExp('^ *\\*[\\t ]*@' + tagName + '\\b', 'm').test(string);
  }

  /*--------------------------------------------------------------------------*/

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

  /*--------------------------------------------------------------------------*/

  /**
   * Extracts the entry's `alias` objects.
   *
   * @memberOf Entry
   * @param {number} index The index of the array value to return.
   * @returns {Array|string} The entry's `alias` objects.
   */
  function getAliases() {
    if (this._aliases == null) {
      var result = _.result(/\*[\t ]*@alias\s+(.+)/.exec(this.entry), 1);
      if (result) {
        result = _.trim(result.replace(/(?:^|\n)[\t ]*\*[\t ]*/, ' '));
        result = result.split(/,\s*/);
        result.sort(compareNatural);
        result = _.map(result, function(value) {
          return new Alias(value, this);
        });
      }
      this._aliases = result;
    }
    return index !== null
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
    if (this._call != null) {
      return this._call;
    }
    var result = _.result(/\*\/\s*(?:function ([^(]*)|(.*?)(?=[:=,]|return\b))/.exec(this.entry), 0);
    if (result) {
      result = _.trim(_.trim(result.split('.').pop()), "'").split('var ').pop();
    }
    // resolve name
    // avoid this.getName() because it calls this.getCall()
    var name = _.trim(_.result(/\*[\t ]*@name\s+(.+)/.exec(this.entry), 1)) || result;

    // compile function call syntax
    if (this.isFunction()) {
      // compose parts
      result = array(result);
      params = this.getParams();
      paramNames = [];

      _.each(params, function(param) {
        // skip params that are properties of other params (e.g. `options.leading`)
        parentParam = _.result(/\w+(?=\.[\w.]+)/.exec(param[1]), 0);
        if (!_.contains(paramNames, parentParam)) {
          result.push(param[1]);
        }
        paramNames.push(param[1].replace(/^\[|\]/, ''));
      })
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
    if (this._category != null) {
      return this._category;
    }
    var result = _.result(/\*[\t ]*@category\s+(.+)/.exec(this.entry), 1);
    if (result) {
      result = cleanValue(value);
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
    if (this._desc != null) {
      return this._desc;
    }
    var result = getMultilineValue(entry, 'description');
    if (result) {
      result = _.trim(result
        .replace(/:\n[\t ]*\*[\t ]*/g, ':<br>\n')
        .replace(/(?:^|\n)[\t ]*\*\n[\t ]*\*[\t ]*/g, '\n\n')
        .replace(/(?:^|\n)[\t ]*\*[\t ]?/g, ' '));

      var type = this.getType();
      result = (type == 'Function' ? '' : '(' + _.trim(type, '{}').replace(/\|/g, ', ') + '): ') + result;
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
    var result = getMultilineValue(entry, 'example');
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
    if (this._isCtor == null) {
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
    if (this._isFunction == null) {
      this._isFunction = !!(
        this.isCtor() ||
        _.size(this.getParams()) ||
        _.size(this.getReturns()) ||
        /\*[\t ]*@function\b/.test(this.entry) ||
        /\*\/\s*function/.test(this.entry)
      );
    }
    return this._isFunction;
  }

  /**
   * Checks if the entry is a license.
   *
   * @memberOf Entry
   * @returns {boolean} Returns `true` if a license, else `false`.
   */
  function isLicense() {
    if (this._isLicense == null) {
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
    if (this._isPlugin == null) {
      this._isPlugin = !this.isCtor() && !this.isPrivate() && !this.isStatic();
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
    if (this._isPrivate == null) {
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
    if (this._isStatic != null) {
      return this._isStatic;
    }
    var isPublic = !this.isPrivate(),
        result = isPublic && hasTag(this.entry, 'static');

    // set in cases where it isn't explicitly stated
    if (isPublic && !result) {
      var parent = _.last(this.getMembers(0).split(/[#.]/));
      if (parent) {
        var source = this.source;
        _.each(Entry.getEntries(source), function(entry) {
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
    if (this._lineNumber == null) {
      var entry = this.entry,
          lines = _.slice(this.source.slice(0, this.source.indexOf(entry) + entry.length).match(/\n/g), 1);

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
  function getMembers() {
    if (this._members == null) {
      var result = getValue(this.entry, 'member');
      if (result) {
        result = result.split(/,\s*/);
        result.sort(compareNatural);
      }
      this._members = result;
    }
    return index !== null
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
    if (this._name == null) {
      this._name = hasTag(this.entry, 'name')
        ? getValue(this.entry, 'name')
        : _.first(this.getCall().splict('('));
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
  function getParams() {]
    if (this._params == null) {
      var tuples = _.compact(_.slice(this.entry.match(/^ *\*[\t ]*@param\s+\{\(?([^})]+)\)?\}\s+(\[.+\]|[\w|]+(?:\[.+\])?)\s+([\s\S]*?)(?=\*\s\@[a-z]|\*\/)/gm), 1)),
          result = [];

      _.each(tuples, function(tuple) {
        _.each(tuple, function(value, index) {
          var array = result[index],
              value = _.trim(value.replace(/(?:^|\n)[\t ]*\*[\t ]*/g, ' '));

          if (array) {
            array.push(value);
          } else {
            result[index] = [value];
          }
        });
      });

      this._params = result;
    }
    return index !== null
      ? this._params[index]
      : this._params;
  }

  /**
   * Extracts the entry's `returns` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `returns` data.
   */
  function getReturns() {
    if (this._returns != null) {
      return this._returns;
    }
    var result = getMultilineValue(this.entry, 'returns');
    if (result) {
      result = _.invoke(result.slice(1), 'trim');
      result[0] = result[0].replace(/\|/g, ', ');
      result[1] = cleanValue(result[1]);
    }
    this._returns = result;
    return result;
  }

  /**
   * Extracts the entry's `type` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `type` data.
   */
  function getType() {
    if (this._type == null) {
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

  /*--------------------------------------------------------------------------*/

  _.extend(Entry.prototype, {
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
    'isStatic': isStatic,
    'getLineNumber': getLineNumber,
    'getMembers': getMembers,
    'getName': getName,
    'getParams': getParams,
    'getReturns': getReturns,
    'getType': getType
  });

  module.exports = Entry;

}());
