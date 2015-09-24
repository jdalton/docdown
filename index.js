/*!
 * docdown v0.2.1
 * Copyright 2011-2015 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <http://mths.be/mit>
 */
'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    generator = require('./lib/generator.js');

/**
 * Generates Markdown documentation based on JSDoc comments.
 *
 * @name docdown
 * @param options The options to use to generate documentation.
 * @returns {string} The generated Markdown code.
 */
function docdown(options) {
  options = _.defaults(options || {}, {
    'hash': 'default',
    'lang': 'js',
    'sort': true,
    'title': path.basename(options.path) + ' API documentation',
    'toc': 'properties'
  });

  if (!options.path || !options.url) {
    throw new Error('Path and URL must be specified');
  }
  return generator(fs.readFileSync(options.path, 'utf8'), options);
}

module.exports = docdown;
