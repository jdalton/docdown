'use strict';

var _ = require('lodash'),
    Entry = require('./entry.js'),
    getEntries =  Entry.getEntries,
    utils = require('./utils.js');

/**
 * Escape special Markdown characters in a string.
 *
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escape(str) {
  // replace all code snippets with a token
  var snippets = [];
  str = str.replace(/`.*?`/g, function(match) {
    snippets.push(match);
    return '@@token@@';
  });

  _.forOwn({
    '*': '&#42;',
    '[': '&#91;',
    ']': '&#93;',
  }, function(replacement, char) {
    str = str.replace(RegExp('(\\\\?)\\' + char, 'g'), function(match, backslash) {
      if (backslash) {
        return match;
      }
      return replacement;
    });
  });

  // replace all tokens with code snippets
  str = str.replace(/@@token@@/g, function(match) {
    return snippets.shift();
  });
  return str;
}

/**
 * Make a anchor link
 *
 * @param {string} Value assigned by attr
 * @param {string} Attr name (id, href)
 * @param {string} contents of element, 'toc' is required
 *
 */
function makeHashHTML(attrValue, attr, contents) {
  contents || (contents = '');
  return '<a ' + attr+'="' + attrValue + '">' +
    contents +
    '</a>';
}

/**
 * Performs common string formatting operations.
 *
 * @private
 * @param {string} string The string to format.
 * @returns {string} The formatted string.
 */
function format(string) {
  // replace all code snippets with a token
  var snippets = [];
  string = string.replace(/`.*?`/g, function(match) {
    snippets.push(match);
    return '@@token@@';
  });

  string = string
    // italicize parentheses
    .replace(/(^|\s)(\([^)]+\))/g, '$1*$2*')
    // mark numbers as inline code
    .replace(/[\t ](-?\d+(?:.\d+)?)(?!\.[^\n])/g, ' `$1`');

  // replace all tokens with code snippets
  string = string.replace(/@@token@@/g, function(match) {
    return snippets.shift();
  });
  return string.trim();
}

/**
 * Get the seperator (. or .prototype.)
 *
 * @param {Entry} Entry object to get selector for
 *
 */
function getSeparator(entry) {
  return entry.isPlugin() ? '.prototype.' : '.';
}

/**
 * Modify a string by replacing named tokens with matching associated object values.
 *
 * @private
 * @param {string} string The string to modify.
 * @param {Object} object The template object.
 * @returns {string} The modified string.
 */
function interpolate(string, object) {
  return format(
    _.template(string)(object)
  );
}

/**
 * Generates the documentation from JS source.
 *
 * @param {string} The source code to generate the documentation for.
 * @param {object} The options object.
 *
 */
function generateDoc(source, options) {
  var url = options.url,
      entries = getEntries(source),
      api = [],
      byCategories = options.toc == 'categories',
      organizedEntries = {},
      categories,
      members = {},
      indexMarkdown = [],
      tocGroups,
      output = '# '+ options.title + '\n\n';

    // add entries and aliases to the API list
  _.each(entries, function(entry) {
    entry = new Entry(entry, source);
    api.push(entry);

    var aliases = entry.getAliases();
    if (aliases) {
      api.push.apply(api, aliases);
    }
  });

  // build the list of categories for the TOC
  // and generate content for each entry
  _.each(api, function(entry) {
    var name = entry.getName();
    // exit early if entry is private or has no name
    if (entry.isPrivate() || !name) {
      return;
    }
    var members = entry.getMembers();
    members.length || (members = ['']);
    var member = members[0];
    var memberGroup;

    if (
      !member ||
      entry.isCtor() ||
      (entry.getType() == 'Object' &&
        !/[=:]\s*(?:null|undefined)\s*[,;]?$/gi.test(entry.entry))
    ) {
      memberGroup = (member ? member + getSeparator(entry) : '') + name;
    } else if (entry.isStatic()) {
      memberGroup = member;
    } else if (!entry.isCtor()) {
      memberGroup = member + getSeparator(entry).slice(0,-1);
    }
    // add entry to TOC
    var tocGroup;
    if (byCategories) {
      var category = entry.getCategory();
      tocGroup = organizedEntries[category] || (organizedEntries[category] = []);
      tocGroup.push(entry);
    } else {
      // if the name of the entry matches a category, just place it directly in the the category
      tocGroup = member && member + getSeparator(entry) + name;
      if (tocGroup && _.keys(organizedEntries).indexOf(tocGroup) != -1) {
        organizedEntries[tocGroup].push(entry);
      } else {
        tocGroup = organizedEntries[memberGroup] || (organizedEntries[memberGroup] = []);
        tocGroup.push(entry);
      }
    }
    // generate description of entry
    // aliases don't get a description
    if (entry.isAlias()) {
      return;
    }
    var markdown = [];
    // start
    markdown.push('<!-- div -->\n');

    // heading
    var theHash = member + entry.getHash();
    entry.theHash = theHash;

    markdown.push(interpolate([
      '### <a id="${hash}"></a>`${member}${separator}${call}`\n',
      '<a href="#${hash}">#</a> ',
      '[&#x24C8;](${href} "View in source") ',
      '[&#x24C9;][1]'
    ].join(''), {
      'call':      entry.getCall(),
      'hash':      theHash,
      'href':      url + '#L' + entry.getLineNumber(),
      'member':    member,
      'separator': getSeparator(entry)
    }));

    markdown.push('');

    // description
    markdown.push(entry.getDesc());
    markdown.push('');

    // function parameters (optional)
    var params = entry.getParams();
    if (params.length) {
      markdown.push('#### Arguments');
      _.each(function(param, index) {
        markdown.push(
          interpolate('${num}. `${name}` (${type}): ${desc}', {
            'desc': escape(param[2]),
            'name': param[1],
            'num':  index + 1,
            'type': escape(param[0])
          })
        );
      });
      markdown.push('');
    }
    // functions returns (optional)
    var returns = entry.getReturns();
    if (returns.length) {
      markdown.push('#### Returns');
      markdown.push(
        interpolate('(${type}): ${desc}', {
          'desc': escape(returns[1]),
          'type': escape(returns[0])
        })
      );
      markdown.push('');
    }
    // function example (optional)
    var example = entry.getExample();
    if (example) {
      markdown.push('#### Example', example);
    }
    // tail
    markdown.push('\n* * *\n');
    markdown.push('<!-- /div -->\n\n');

    entry.markdown = markdown.join('\n');
  });

  //toc
  tocGroups = Object.keys(organizedEntries);
  tocGroups.sort(utils.compareNatural);

  _.each(tocGroups, function(group) {
    //toc category head
    indexMarkdown.push(
      '<!-- div -->\n',
      '## ' +
      makeHashHTML(group.toLowerCase(),
        'id'
      ) +
      '`' + group + '`'
    );

    //sort the groups
    organizedEntries[group].sort(function(a, b) {
      var result = utils.compareNatural(
        a.isAlias() ? a.getName() : a.getCall(),
        b.isAlias() ? b.getName() : b.getCall()
      );
      return result;
    });

    // entries for each category
    _.each(organizedEntries[group], function(anIndexEntry) {
      if (anIndexEntry.isAlias()) {
        //alias has a more complex html structure
        indexMarkdown.push(
          '* <a href="' +
          '#' + anIndexEntry.getOwner().theHash +
          '" class="alias">' +
          escape(
            anIndexEntry.getMembers(0) +
            getSeparator(anIndexEntry) +
            anIndexEntry.getName()
          ) +
          ' -> ' + anIndexEntry.getOwner().getName() +
          '</a>'
        );
      } else {
        // simple toc entry
        indexMarkdown.push(
          '* ' +
          makeHashHTML(
            '#' + anIndexEntry.theHash,
            'href',
            escape(
              (anIndexEntry.getMembers(0) ? (anIndexEntry.getMembers(0) + getSeparator(anIndexEntry))  : '') +
              anIndexEntry.getName()
            )
          )
        );
      }
    });
  });

  // wrapup toc section
  indexMarkdown.push('\n<!-- /div -->\n')
  output += indexMarkdown.join('\n');

  _.each(tocGroups, function(group) {
    output += '\n<!-- div -->\n';
    if (byCategories) {
      output += '## `"' + group + '" Methods` \n';
    } else {
      output += '## `' + group + '` \n';
    }
    _.each(organizedEntries[group], function(entry) {
      if (entry.markdown) {
        output += entry.markdown;
      }
    });
   output += '\n<!-- /div -->\n\n';
  });

  // back to top
  output += ' [1]: #' + tocGroups[0].toLowerCase() + ' "Jump back to the TOC."\n';

  return output;
}

module.exports = generateDoc;
