#!/usr/bin/env node
'use strict';

/** Load Node.js modules */
var fs = require('fs'),
    path = require('path'),
    url = require('url');

/** Load other modules */
var _ = require('lodash'),
    docdown = require('../index.js');

/** The list of arguments provided */
var argv = process.argv;

/*----------------------------------------------------------------------------*/

/**
 * Gets the value for the given option name. If no value is available the
 * `defaultValue` is returned.
 *
 * @private
 * @param {string} name The name of the option.
 * @param {*} defaultValue The default option value.
 * @returns {*} Returns the option value.
 */
function getOption(name, defaultValue) {
  return _.reduce(process.argv, function(result, value) {
    value = optionToValue(name, value);

    return value == null ? result : value;
  }, defaultValue);
}

/**
 * Extracts the option value from an option string.
 *
 * @private
 * @param {string} name The name of the option to inspect.
 * @param {string} string The options string.
 * @returns {string|undefined} Returns the option value, else `undefined`.
 */
function optionToValue(name, string) {
  var result = string.match(RegExp('^' + name + '(?:=([\\s\\S]+))?$'));
  if (result) {
    result = _.result(result, 1);
    result = result ? _.trim(result) : true;
  }
  if (result === 'false') {
    return false;
  }
  return result || undefined;
}

/*----------------------------------------------------------------------------*/

var cwd = process.cwd(),
    fileName = argv[2],
    outputFile = argv[3];

if (
  !fileName ||
  !outputFile ||
  _.find(argv, function(arg) {
    return /^(?:-h|--help)$/.test(arg);
  })
) {
  console.log([
    'Usage:',
    '  docdown inputFile.js outputFile.md [options]',
    'Options:',
    '  lang="js"                   The language indicator for code blocks.',
    '  sort=true|false             Specify whether entries are sorted.',
    '  style="default|github"      The hash style for links.',
    '  title="title"               The documentation title.',
    '  toc="categories|properties" The table of contents organization style.',
    '  url="url"                   The source URL.'
  ].join('\n'));
  process.exit(1);
}

fileName = path.join(cwd, fileName);
outputFile = path.join(cwd, outputFile);

var options = {
  'lang': getOption('lang'),
  'path': fileName,
  'sort': getOption('sort'),
  'style': getOption('style'),
  'title': getOption('title'),
  'toc': getOption('toc'),
  'url': getOption('url')
};

var output = docdown(options);

fs.writeFileSync(outputFile, output, 'utf8');

process.exit(0);
