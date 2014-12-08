/*!
 * Docdown v1.0.0-pre
 * Copyright 2011-2014 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <http://mths.be/mit>
 */

;(function() {
  'use strict';

  var _ = require('lodash'),
      path = require('path'),
      fs = require('fs'),
      generateDoc = require('./lib/generator.js');

  /**
   * Generates Markdown documentation based on JSDoc comments.
   *
   * @name docdown
   * @param options The options to use to generate documentation.
   * @returns {string} The generated Markdown code.
   */
  function docdown(options) {
    if (!options.path || !options.url) {
      throw new Error("Path and/or URL must be specified");
    }

    _.defaults(options, {
      toc   : 'properties',
      lang  : 'js',
      title : path.basename(options.path) + ' API documentation'
    });

    return generateDoc(
      fs.readFileSync(options.path, 'utf8'),
      options
    );
  }

  module.exports = docdown;
}());
