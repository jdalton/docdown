<?php
/*!
 * This file is part of the DocDown package. 
 * Copyright 2011 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <http://mths.be/mit>
 */

require(dirname(__FILE__) . "/src/DocDown/Generator.php");

/**
 * Generates Markdown from JSDoc entries in a given file.
 * @param {Array} $options The options array.
 * @returns {String} The generated Markdown.
 */
function docdown( $options = array() ) {
  $gen = new Generator($options);
  return $gen->generate();
}
?>