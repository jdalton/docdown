;(function() {
  'use strict';

  var _ = require('lodash'),
      os = require('os'),
      Alias = require('./alias.js');

  var cleanValue = require('./cleanValue'),
      compareNatural = require('./compareNatural'),
      getEntries = require('./getEntries'),
      getMultilineValue = require('./getMultilineValue'),
      getValue = require('./getValue'),
      hasTag = require('./hasTag');

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
    this.source = source.replace(os.EOL, '\n');

    _.extend(this, Entry.prototype, function(__, method){
      return _.memoize(method);
    });
  }

  /**
   * Extracts the entry's `alias` objects.
   *
   * @memberOf Entry
   * @param {number} index The index of the array value to return.
   * @returns {Array|string} The entry's `alias` objects.
   */
  function getAliases(index) {
    var result = _.result(/\*[\t ]*@alias\s+(.+)/.exec(this.entry), 1);
    if (result) {
      result = cleanValue(result);
      result = result.split(/,\s*/);
      result.sort(compareNatural);
      result = _.map(result, function(value) {
        return new Alias(value, this);
      }, this);
    }

    return index != null
      ? result[index]
      : result;
  }

  /**
   * Extracts the function call from the entry.
   *
   * @memberOf Entry
   * @returns {string} The function call.
   */
  function getCall() {
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
      result = new Array(result);
      var params = this.getParams();
      var paramNames = [];

      _.each(params, function(param) {
        // skip params that are properties of other params (e.g. `options.leading`)
        parentParam = _.result(/\w+(?=\.[\w.]+)/.exec(param[1]), 0);
        if (!_.contains(paramNames, parentParam)) {
          result.push(param[1]);
        }
        paramNames.push(param[1].replace(/^\[|\]/, ''));
      });
      // format
      result = name + '(' + result.slice(1).join(', ') + ')';
    }
    return result ? result : name;
  }

  /**
   * Extracts the entry's `category` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `category` data.
   */
  function getCategory() {
    var result = _.result(/\*[\t ]*@category\s+(.+)/.exec(this.entry), 1);
    if (result) {
      result = cleanValue(value);
    } else {
      result = this.getType() == 'Function' ? 'Methods' : 'Properties';
    }

    return result;
  }

  /**
   * Extracts the entry's description.
   *
   * @memberOf Entry
   * @returns {string} The entry's description.
   */
  function getDesc() {
    var result = getMultilineValue(this.entry, 'description');
    if (result) {
      result = _.trim(result
        .replace(/:\n[\t ]*\*[\t ]*/g, ':<br>\n')
        .replace(/(?:^|\n)[\t ]*\*\n[\t ]*\*[\t ]*/g, '\n\n')
        .replace(/(?:^|\n)[\t ]*\*[\t ]?/g, ' '));

      var type = this.getType();
      result = (type == 'Function' ? '' : '(' + _.trim(type, '{}').replace(/\|/g, ', ') + '): ') + result;
    }

    return result;
  }

  /**
   * Extracts the entry's `example` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `example` data.
   */
  function getExample() {
    var result = getMultilineValue(this.entry, 'example');
    if (result) {
      result = '```' + this.lang + '\n' + result + '\n```';
    }

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
    return hasTag(this.entry, 'constructor');
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
      /\*[\t ]*@function\b/.test(this.entry) ||
      /\*\/\s*function/.test(this.entry)
    );
  }

  /**
   * Checks if the entry is a license.
   *
   * @memberOf Entry
   * @returns {boolean} Returns `true` if a license, else `false`.
   */
  function isLicense() {
    return hasTag(this.entry, 'license');
  }

  /**
   * Checks if the entry *is* assigned to a prototype.
   *
   * @memberOf Entry
   * @returns {boolean} Returns `true` if assigned to a prototype, else `false`.
   */
  function isPlugin() {
    return !this.isCtor() && !this.isPrivate() && !this.isStatic();
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
      hasTag(this.entry, 'private') ||
      !hasTag(this.entry, '*')
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
        result = isPublic && hasTag(this.entry, 'static');

    // set in cases where it isn't explicitly stated
    if (isPublic && !result) {
      var parent = _.last(this.getMembers(0).split(/[#.]/));
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

    return result;
  }

  /**
   * Resolves the entry's line number.
   *
   * @memberOf Entry
   * @returns {number} The entry's line number.
   */
  function getLineNumber() {
    var entry = this.entry,
        lines = _.slice(this.source.slice(0, this.source.indexOf(entry) + entry.length).match(/\n/g), 1);

    return lines.length + 1;
  }

  /**
   * Extracts the entry's `member` data.
   *
   * @memberOf Entry
   * @param {number} [index] The index of the array value to return.
   * @returns {Array|string} The entry's `member` data.
   */
  function getMembers(index) {
    var result = getValue(this.entry, 'member');
    if (result) {
      result = result.split(/,\s*/);
      result.sort(compareNatural);
    }

    return index != null
      ? result[index]
      : result;
  }

  /**
   * Extracts the entry's `name` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `name` data.
   */
  function getName() {
    return hasTag(this.entry, 'name') ? getValue(this.entry, 'name') : _.first(this.getCall().split('('));
  }

  /**
   * Extracts the entry's `param` data.
   *
   * @memberOf Entry
   * @param {number} [index] The index of the array value to return.
   * @returns {Array} The entry's `param` data.
   */
  function getParams(index) {
    // TODO: needs lots of work
    var tuples = _.compact(this.entry.match(/^ *\*[\t ]*@param\s+\{\(?([^})]+)\)?\}\s+(\[.+\]|[\w|]+(?:\[.+\])?)\s+([\s\S]*?)(?=\*\s\@[a-z]|\*\/)/gm)),
        result = [];

    _.each(tuples, function(tuple, index) {
      result[index] = [tuple];
    });

    return index != null
      ? result[index]
      : result;
  }

  /**
   * Extracts the entry's `returns` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `returns` data.
   */
  function getReturns() {
    var result = getMultilineValue(this.entry, 'returns');
    // regexp for the type and description
    result = /{([^}]+)\}\s+([\s\S]+)/gm.exec(result);
    if (result) {
      return {
        type: result[1].replace(/\|/g, ', '),
        desc: cleanValue(result[2])
      };
    }
  }

  /**
   * Extracts the entry's `type` data.
   *
   * @memberOf Entry
   * @returns {string} The entry's `type` data.
   */
  function getType() {
    var result = getValue(this.entry, 'type');
    if (result) {
      if (/^(?:array|function|object|regexp)$/.test(result)) {
        result = _.capitalize(result);
      }
    } else {
      result = this.isFunction() ? 'Function' : 'unknown';
    }
    return result;
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
    'isFunction': isFunction,
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
