'use strict';

var _ = require('lodash');

/*----------------------------------------------------------------------------*/

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
}

/**
 * Extracts the entry's `alias` objects.
 *
 * @memberOf Alias
 * @param {number} [index] The index of the array value to return.
 * @returns {Array|string} Returns the entry's `alias` objects.
 */
function getAliases(index) {
  return index == null ? [] : undefined;
}

/**
 * Extracts the function call from the owner entry.
 *
 * @memberOf Alias
 * @returns {string} Returns the function call.
 */
function getCall() {
  return this._owner.getCall();
}

/**
 * Extracts the owner entry's `category` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `category` data.
 */
function getCategory() {
  return this._owner.getCategory();
}

/**
 * Extracts the owner entry's description.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's description.
 */
function getDesc() {
  return this._owner.getDesc();
}

/**
 * Extracts the owner entry's `example` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `example` data.
 */
function getExample() {
  return this._owner.getExample();
}

/**
 * Extracts the entry's hash value for permalinking.
 *
 * @memberOf Alias
 * @param {string} [style] The hash style.
 * @returns {string} Returns the entry's hash value (without a hash itself).
 */
function getHash(style) {
  return this._owner.getHash(style);
}

/**
 * Resolves the owner entry's line number.
 *
 * @memberOf Alias
 * @returns {number} Returns the owner entry's line number.
 */
function getLineNumber() {
  return this._owner.getLineNumber();
}

/**
 * Extracts the owner entry's `member` data.
 *
 * @memberOf Alias
 * @param {number} [index] The index of the array value to return.
 * @returns {Array|string} Returns the owner entry's `member` data.
 */
function getMembers(index) {
  return this._owner.getMembers(index);
}

/**
 * Extracts the owner entry's `name` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `name` data.
 */
function getName() {
  return this._name;
}

/**
 * Gets the owner entry object.
 *
 * @memberOf Alias
 * @returns {Object} Returns the owner entry.
 */
function getOwner() {
  return this._owner;
}

/**
 * Extracts the owner entry's `param` data.
 *
 * @memberOf Alias
 * @param {number} [index] The index of the array value to return.
 * @returns {Array} Returns the owner entry's `param` data.
 */
function getParams(index) {
  return this._owner.getParams(index);
}

/**
 * Extracts the owner entry's `returns` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `returns` data.
 */
function getReturns() {
  return this._owner.getReturns();
}

/**
 * Extracts the owner entry's `since` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `since` data.
 */
function getSince() {
  return this._owner.getSince();
}

/**
 * Extracts the owner entry's `type` data.
 *
 * @memberOf Alias
 * @returns {string} Returns the owner entry's `type` data.
 */
function getType() {
  return this._owner.getType();
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
  return this._owner.isCtor();
}

/**
 * Checks if the entry is a function reference.
 *
 * @memberOf Alias
 * @returns {boolean} Returns `true` if the entry is a function reference, else `false`.
 */
function isFunction() {
  return this._owner.isFunction();
}

/**
 * Checks if the owner entry is a license.
 *
 * @memberOf Alias
 * @returns {boolean} Returns `true` if a license, else `false`.
 */
function isLicense() {
  return this._owner.isLicense();
}

/**
 * Checks if the owner entry *is* assigned to a prototype.
 *
 * @memberOf Alias
 * @returns {boolean} Returns `true` if assigned to a prototype, else `false`.
 */
function isPlugin() {
  return this._owner.isPlugin();
}

/**
 * Checks if the owner entry is private.
 *
 * @memberOf Alias
 * @returns {boolean} Returns `true` if private, else `false`.
 */
function isPrivate() {
  return this._owner.isPrivate();
}

/**
 * Checks if the owner entry is *not* assigned to a prototype.
 *
 * @memberOf Alias
 * @returns {boolean} Returns `true` if not assigned to a prototype, else `false`.
 */
function isStatic() {
  return this._owner.isStatic();
}

/*----------------------------------------------------------------------------*/

_.assign(Alias.prototype, {
  'getAliases': getAliases,
  'getCall': getCall,
  'getCategory': getCategory,
  'getDesc': getDesc,
  'getExample': getExample,
  'getHash': getHash,
  'getLineNumber': getLineNumber,
  'getMembers': getMembers,
  'getName': getName,
  'getOwner': getOwner,
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
  'isStatic': isStatic,
});

module.exports = Alias;
