/*!
 * docdown
 * Copyright 2011-2016 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    generator = require('./lib/generator.js');

/**
 * Generates Markdown documentation based on JSDoc comments.
 *
 * @param {Object} options The options object.
 * @param {string} options.path The input file path.
 * @param {string} options.url The source URL.
 * @param {string} [options.lang='js'] The language indicator for code blocks.
 * @param {boolean} [options.sort=true] Specify whether entries are sorted.
 * @param {string} [options.style='default'] The hash style for links ('default' or 'github').
 * @param {string} [options.title='<%= basename(options.path) %> API documentation'] The documentation title.
 * @param {string} [options.toc='properties'] The table of contents organization style ('categories' or 'properties').
 * @returns {string} The generated Markdown code.
 */
function docdown(options) {
  options = _.defaults(options, {
    'lang': 'js',
    'sort': true,
    'style': 'default',
    'title': path.basename(options.path) + ' API documentation',
    'toc': 'properties'
  });

  if (!options.path || !options.url) {
    throw new Error('Path and URL must be specified');
  }
  return generator(fs.readFileSync(options.path, 'utf8'), options);
}

module.exports = docdown;
