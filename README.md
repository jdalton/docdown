# Docdown v1.0.0

A simple JSDoc to Markdown documentation generator.

## Documentation

* [doc/README.md](https://github.com/jdalton/docdown/blob/master/doc/README.md#readme)
* [wiki/Roadmap](https://github.com/jdalton/docdown/wiki/Roadmap)

## Usage

```js
var docdown = require('docdown');

var markdown = docdown({
  'path': filepath,
  'url': 'https://github.com/username/project/blob/master/my.js'
});
```
