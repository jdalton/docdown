'use strict';

var _ = require('lodash'),
    Entry = require('./entry.js'),
    getEntries = Entry.getEntries,
    utils = require('./utils.js');

var push = Array.prototype.push,
    specialCategories = ['Methods', 'Properties'],
    token = '@@token@@';

var reCode = /`.*?`/g,
    reToken = /@@token@@/g,
    reSpecialCategory = RegExp('^(?:' + specialCategories.join('|') + ')$');

var htmlEscapes = {
  '*': '&#42;',
  '[': '&#91;',
  ']': '&#93;'
};

/*----------------------------------------------------------------------------*/

/**
 * Escape special Markdown characters in a string.
 *
 * @private
 * @param {string} string The string to escape.
 * @returns {string} The escaped string.
 */
function escape(string) {
  var snippets = [];

  // replace all code snippets with a token
  string = string.replace(reCode, function(match) {
    snippets.push(match);
    return token;
  });

  _.forOwn(htmlEscapes, function(replacement, chr) {
    string = string.replace(RegExp('(\\\\?)\\' + chr, 'g'), function(match, backslash) {
      return backslash ? match : replacement;
    });
  });

  // replace all tokens with code snippets
  return string.replace(reToken, function(match) {
    return snippets.shift();
  });
}

/**
 * Make an anchor link.
 *
 * @private
 * @param {string} Value assigned by attr.
 * @param {string} Attr name (id, href).
 * @param {string} contents of element, 'toc' is required.
 *
 */
function makeHashHTML(attrValue, attr, contents) {
  return '<a ' + attr+'="' + attrValue + '">' + (contents || '') + '</a>';
}

/**
 * Performs common string formatting operations.
 *
 * @private
 * @param {string} string The string to format.
 * @returns {string} The formatted string.
 */
function format(string) {
  var snippets = [];

  // replace all code snippets with a token
  string = string.replace(reCode, function(match) {
    snippets.push(match);
    return token;
  });

  return _.trim(string
    // italicize parentheses
    .replace(/(^|\s)(\([^)]+\))/g, '$1*$2*')
    // mark numbers as inline code
    .replace(/[\t ](-?\d+(?:.\d+)?)(?!\.[^\n])/g, ' `$1`')
    // replace all tokens with code snippets
    .replace(reToken, function(match) {
      return snippets.shift();
    }));
}

/**
 * Get the seperator (`.` or `.prototype.`)
 *
 * @private
 * @param {Entry} Entry object to get selector for.
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
  return format(_.template(string)(object));
}

/*----------------------------------------------------------------------------*/

/**
 * Generates the documentation from JS source.
 *
 * @param {string} The source code to generate the documentation for.
 * @param {object} The options object.
 */
function generateDoc(source, options) {
  var api = [],
      byCategories = options.toc == 'categories',
      entries = getEntries(source),
      hashStyle = options.hash,
      organized = {},
      result = '# '+ options.title + '\n',
      url = options.url;

  // add entries and aliases to the API list
  _.each(entries, function(entry) {
    entry = new Entry(entry, source);
    api.push(entry);

    var aliases = entry.getAliases();
    if (!_.isEmpty(aliases)) {
      push.apply(api, aliases);
    }
  });

  // build the list of categories for the TOC
  // and generate content for each entry
  _.each(api, function(entry) {
    // exit early if entry is private or has no name
    var name = entry.getName();
    if (!name || entry.isPrivate()) {
      return;
    }
    var tocGroup,
        member = entry.getMembers(0) || '';

    // add entry to TOC
    if (byCategories) {
      var category = entry.getCategory();
      tocGroup = organized[category] || (organized[category] = []);
    }
    else {
      var memberGroup;
      if (!member ||
          entry.isCtor() ||
          (entry.getType() == 'Object' &&
            !/[=:]\s*(?:null|undefined)\s*[,;]?$/gi.test(entry.entry))
      ) {
        memberGroup = (member ? member + getSeparator(entry) : '') + name;
      } else if (entry.isStatic()) {
        memberGroup = member;
      } else if (!entry.isCtor()) {
        memberGroup = member + getSeparator(entry).slice(0, -1);
      }
      tocGroup = organized[memberGroup] || (organized[memberGroup] = []);
    }
    tocGroup.push(entry);

    // generate description of entry
    // aliases don't get a description
    if (entry.isAlias()) {
      return;
    }
    // start
    var markdown = ['\n<!-- div -->\n'];

    // heading
    markdown.push(
      interpolate([
        '### <a id="${hash}"></a>`${member}${separator}${call}`\n',
        '<a href="#${hash}">#</a> ',
        '[&#x24C8;](${href} "View in source") ',
        '[&#x24C9;][1]'
      ].join(''), {
        'call':      entry.getCall(),
        'hash':      entry.getHash(hashStyle),
        'href':      url + '#L' + entry.getLineNumber(),
        'member':    member,
        'separator': getSeparator(entry)
      })
    );

    // description
    markdown.push('\n' + entry.getDesc() + '\n');

    // function parameters (optional)
    var params = entry.getParams();
    if (!_.isEmpty(params)) {
      markdown.push('#### Arguments');
      _.each(params, function(param, index) {
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
    if (!_.isEmpty(returns)) {
      markdown.push(
        '#### Returns',
        interpolate('(${type}): ${desc}', {
          'desc': escape(returns[1]),
          'type': escape(returns[0])
        }),
        ''
      );
    }
    // function example (optional)
    var example = entry.getExample();
    if (example) {
      markdown.push('#### Example', example);
    }
    // tail
    markdown.push('* * *\n\n<!-- /div -->\n');
    entry.markdown = markdown.join('\n');
  });

  // Table of Contents headers.
  var tocGroups = _.keys(organized);
  if (byCategories) {
    // Remove special categories.
    _.pull.apply(_, [tocGroups].concat(specialCategories));

    // Sort categories and append special categories.
    tocGroups.sort(utils.compareNatural);
    push.apply(tocGroups, specialCategories);
  }
  else {
    tocGroups.sort(utils.compareNatural);
  }
  var markdown = [];
  _.each(tocGroups, function(group) {
    // toc category head
    markdown.push(
      '\n<!-- div -->\n',
      '## ' +
      makeHashHTML(group.toLowerCase(), 'id') +
      '`' + group + '`'
    );

    // sort the groups
    organized[group].sort(function(value, other) {
      var valMember = value.getMembers(0),
          othMember = other.getMembers(0);

      return utils.compareNatural(
        (valMember ? (valMember + getSeparator(value)) : '') + value.getName(),
        (othMember ? (othMember + getSeparator(other)) : '') + other.getName()
      );
    });

    // entries for each category
    _.each(organized[group], function(entry) {
      var member = entry.getMembers(0) || '',
          name = entry.getName(),
          sep = getSeparator(entry),
          title = escape((member ? (member + sep) : '') + name);

      if (entry.isAlias()) {
        // alias has a more complex html structure
        var owner = entry.getOwner();
        markdown.push(
          '* <a href="#' + owner.getHash(hashStyle) + '" class="alias">`' +
          title + '` -> `' + owner.getName() + '`' +
          '</a>'
        );
      } else {
        // simple toc entry
        markdown.push(
          '* ' +
          makeHashHTML(
            '#' + entry.getHash(hashStyle),
            'href',
            '`' + title + '`'
          )
        );
      }
    });
  });

  // wrapup toc section
  markdown.push('\n<!-- /div -->\n');
  result += markdown.join('\n');

  _.each(tocGroups, function(group) {
    result += '\n<!-- div -->\n\n';
    if (byCategories && !reSpecialCategory.test(group)) {
      var groupName = '“' + group + '” Methods';
    }
    result += '## `' + (groupName || group) + '` \n';
    _.each(organized[group], function(entry) {
      if (entry.markdown) {
        result += entry.markdown;
      }
    });
   result += '\n<!-- /div -->\n\n';
  });

  // back to top
  result += ' [1]: #' + tocGroups[0].toLowerCase() + ' "Jump back to the TOC."\n';

  return result;
}

module.exports = generateDoc;
