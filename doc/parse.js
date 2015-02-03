'use strict';

var fs = require('fs'),
    path = require('path'),
    docdown = require('../index.js');

var packagePath = path.resolve(__dirname, '..', 'package.json'),
    packageText = fs.readFileSync(packagePath, 'utf-8'),
    packageJSON = JSON.parse(packageText);

var reExt = /\.[a-z]+$/;

// The version number from the package.json.
var version = packageJSON.version;

// The input filename.
var file = process.argv[2] + (reExt.test(process.argv[2]) ? '' : '.js');

// The output filename.
var output = process.argv[3] || (path.basename(file).replace(reExt, '') + '.md')

/*----------------------------------------------------------------------------*/

var markdown = docdown({
  'path': path.join(process.cwd(), file),
  'title': 'docdown <sup>v' + version + '</sup>',
  'url': 'https://github.com/jdalton/docdown/tree/' + version + '/index.js'
});

fs.writeFileSync(output, markdown);

console.log(markdown + '\n');
