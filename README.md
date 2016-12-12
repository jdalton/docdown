# docdown v0.7.2

A simple JSDoc to Markdown documentation generator.

## Usage

```js
var docdown = require('docdown');

var markdown = docdown({
  'files': [
    {
      'path': filepath,
      'url': 'https://github.com/username/project/blob/master/my.js'
    }
  ]
});
```
