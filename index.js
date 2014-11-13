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
   * @constructor
   * @name docdown
   * @param options The options to use to generate docs.
   * @returns {string} The generated Markdown code.
   */
  function docdown(options) {
    var output;

    if (!options.path || !options.url) {
      throw new Error("Path and/or URL must be specified");
    }

    options = _.assign({
      toc   : 'properties',
      lang  : 'js',
      title : path.basename(options.path) + ' API documentation'
    }, options);

    output = '# '+ options.title + '\n\n' + generateDoc(fs.readFileSync(options.path,'utf8'), options);
    
    return output;
    
  }

  module.exports = docdown;
}());
