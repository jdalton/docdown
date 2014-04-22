(function() {

  var fs = require("fs"),
      path = require("path");

  var docdown = require("../");

  // input filename
  var file = process.argv[2].replace(/(\.*[\/])+/, '');
  file += /\.[a-z]+$/.test(file) ? '' : '.php';

  // output filename
  var output = process.argv[3] || basename(file);

  /*--------------------------------------------------------------------------*/

  // generate Markdown
  var markdown = docdown({
    'path': '../' + file,
    'title': 'Docdown <sup>v1.0.0</sup>',
    'url': 'https://github.com/jdalton/docdown/blob/master/index.js'
  });

  // save to a .md file
  fs.writeFileSync(output + '.md', markdown);

  console.log(markdown + '\n');

}());
