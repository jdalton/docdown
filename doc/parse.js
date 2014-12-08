(function() {

  var fs = require("fs"),
      path = require("path");

  var docdown = require("../index.js");

  // input filename
  var file = process.argv[2];
  file += /\.[a-z]+$/.test(file) ? '' : '.js';

  // output filename
  var output = process.argv[3] || path.basename(file);

  /*--------------------------------------------------------------------------*/

  // generate Markdown
  var markdown = docdown({
    'path': path.join(process.cwd(), file),
    'title': 'Docdown <sup>v1.0.0</sup>',
    'url': 'https://github.com/jdalton/docdown/blob/master/index.js'
  });

  // save to a .md file
  fs.writeFileSync(output + '.md', markdown);

  console.log(markdown + '\n');

}());
