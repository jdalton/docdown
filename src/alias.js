;(function() {
  'use strict';

  var _ = require('lodash');

  /*--------------------------------------------------------------------------*/

  /**
   * The Alias constructor.
   *
   * @constructor
   * @param {string} name The alias name.
   * @param {Object} owner The alias owner.
   */
  function Alias(name, owner) {
    this._owner = owner;
    this._name = name;
    this._call = owner.getCall();
    this._category = owner.getCategory();
    this._desc = owner.getDesc();
    this._example = owner.getExample();
    this._isCtor = owner.isCtor();
    this._isLicense = owner.isLicense();
    this._isPlugin = owner.isPlugin();
    this._isPrivate = owner.isPrivate();
    this._isStatic = owner.isStatic();
    this._lineNumber = owner.getLineNumber();
    this._members = owner.getMembers();
    this._params = owner.getParams();
    this._returns = owner.getReturns();
    this._type = owner.getType();
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Extracts the entry's `alias` objects.
   *
   * @memberOf Alias
   * @param {number} [index] The index of the array value to return.
   * @returns {Array|string} The entry's `alias` objects.
   */
  function getAliases(index) {
    return index == null ? [] : undefined;
  }

  /**
   * Extracts the function call from the owner entry.
   *
   * @memberOf Alias
   * @returns {string} The function call.
   */
  function getCall() {
    return this._call;
  }

  /**
   * Extracts the owner entry's `category` data.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's `category` data.
   */
  function getCategory() {
    return this._category;
  }

  /**
   * Extracts the owner entry's description.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's description.
   */
  function getDesc() {
    return this._desc;
  }

  /**
   * Extracts the owner entry's `example` data.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's `example` data.
   */
  function getExample() {
    return this._example;
  }

  /**
   * Checks if the entry is an alias.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true`.
   */
  function isAlias() {
    return true;
  }

  /**
   * Checks if the owner entry is a constructor.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true` if a constructor, else `false`.
   */
  function isCtor() {
    return this._isCtor;
  }

  /**
   * Checks if the owner entry is a license.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true` if a license, else `false`.
   */
  function isLicense() {
    return this._isLicense;
  }

  /**
   * Checks if the owner entry *is* assigned to a prototype.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true` if assigned to a prototype, else `false`.
   */
  function isPlugin() {
    return this._isPlugin;
  }

  /**
   * Checks if the owner entry is private.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true` if private, else `false`.
   */
  function isPrivate() {
    return this._isPrivate;
  }

  /**
   * Checks if the owner entry is *not* assigned to a prototype.
   *
   * @memberOf Alias
   * @returns {boolean} Returns `true` if not assigned to a prototype, else `false`.
   */
  function isStatic() {
    return this._isStatic;
  }

  /**
   * Resolves the owner entry's line number.
   *
   * @memberOf Alias
   * @returns {number} The owner entry's line number.
   */
  function getLineNumber() {
    return this._lineNumber;
  }

  /**
   * Extracts the owner entry's `member` data.
   *
   * @memberOf Alias
   * @param {number} [index] The index of the array value to return.
   * @returns {Array|string} The owner entry's `member` data.
   */
  function getMembers(index) {
    return index != null
      ? this._members[index]
      : this._members;
  }

  /**
   * Extracts the owner entry's `name` data.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's `name` data.
   */
  function getName() {
    return this._name;
  }

  /**
   * Gets the owner entry object.
   *
   * @memberOf Alias
   * @returns {Object} The owner entry.
   */
  function getOwner() {
    return this._owner;
  }

  /**
   * Extracts the owner entry's `param` data.
   *
   * @memberOf Alias
   * @param {number} [index] The index of the array value to return.
   * @returns {Array} The owner entry's `param` data.
   */
  function getParams(index) {
    return index !== null
      ? this._params[index]
      : this._params;
  }

  /**
   * Extracts the owner entry's `returns` data.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's `returns` data.
   */
  function getReturns() {
    return this._returns;
  }

  /**
   * Extracts the owner entry's `type` data.
   *
   * @memberOf Alias
   * @returns {string} The owner entry's `type` data.
   */
  function getType() {
    return this._type;
  }

  /*--------------------------------------------------------------------------*/

  _.extend(Alias.prototype, {
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
    'getOwner': getOwner,
    'getParams': getParams,
    'getReturns': getReturns,
    'getType': getType
  });

  module.exports = Alias;

}());
