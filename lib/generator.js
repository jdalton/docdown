'use strict';

var _ = require('lodash'),
    Entry = require('./entry.js'),
    getEntries = Entry.getEntries,
    util = require('./util.js');

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
 * @returns {string} Returns the escaped string.
 */
function escape(string) {
  var snippets = [];

  // Replace all code snippets with a token.
  string = string.replace(reCode, function(match) {
    snippets.push(match);
    return token;
  });

  _.forOwn(htmlEscapes, function(replacement, chr) {
    string = string.replace(RegExp('(\\\\?)\\' + chr, 'g'), function(match, backslash) {
      return backslash ? match : replacement;
    });
  });

  // Replace all tokens with code snippets.
  return string.replace(reToken, function(match) {
    return snippets.shift();
  });
}

/**
 * Get the seperator (`.` or `.prototype.`)
 *
 * @private
 * @param {Entry} Entry object to get selector for.
 * @returns {string} Returns the member seperator.
 */
function getSeparator(entry) {
  return entry.isPlugin() ? '.prototype.' : '.';
}

/**
 * Modify a string by replacing named tokens with matching associated object values.
 *
 * @private
 * @param {string} string The string to modify.
 * @param {Object} data The template data object.
 * @returns {string} Returns the modified string.
 */
function interpolate(string, data) {
  return util.format(_.template(string)(data));
}

/**
 * Make an anchor link.
 *
 * @private
 * @param {string} href The anchor href.
 * @param {string} text The anchor text.
 * @returns {string} Returns the anchor HTML.
 */
function makeAnchor(href, text) {
  return '<a href="' + href + '">' + _.toString(text) + '</a>';
}

/*----------------------------------------------------------------------------*/

/**
 * Generates the documentation from JS source.
 *
 * @param {string} The source code to generate the documentation for.
 * @param {object} The options object.
 * @returns {string} Returns the documentation markdown.
 */
function generateDoc(source, options) {
  var api = [],
      byCategories = options.toc == 'categories',
      entries = getEntries(source),
      organized = {},
      sortEntries = options.sort,
      style = options.style,
      url = options.url;

  // Add entries and aliases to the API list.
  _.each(entries, function(entry) {
    entry = new Entry(entry, source);
    api.push(entry);

    var aliases = entry.getAliases();
    if (!_.isEmpty(aliases)) {
      push.apply(api, aliases);
    }
  });

  // Build the list of categories for the TOC and generate content for each entry.
  _.each(api, function(entry) {
    // Exit early if the entry is private or has no name.
    var name = entry.getName();
    if (!name || entry.isPrivate()) {
      return;
    }
    var tocGroup,
        member = entry.getMembers(0) || '',
        separator = member ? getSeparator(entry) : '';

    // Add the entry to the TOC.
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

    // Skip aliases.
    if (entry.isAlias()) {
      return;
    }
    // Start markdown for the entry.
    var entryMarkdown = ['\n<!-- div -->\n'];

    var entryData = {
      'call': entry.getCall(),
      'category': entry.getCategory(),
      'entryHref': '#${hash}',
      'entryLink': _.get(options, 'entryLink', style == 'github' ? '' : '<a href="${entryHref}">#</a>&nbsp;'),
      'hash': entry.getHash(style),
      'member': member,
      'name': name,
      'separator': separator,
      'sourceHref': url + '#L' + entry.getLineNumber(),
      'sourceLink': _.get(options, 'sourceLink', '[&#x24C8;](${sourceHref} "View in source")'),
      'tocHref': '1',
      'tocLink': _.get(options, 'tocLink', '[&#x24C9;][${tocHref}]')
    };

    _.each([
      'entryHref', 'sourceHref', 'tocHref',
      'entryLink', 'sourceLink', 'tocLink'
    ], function(option) {
      entryData[option] = interpolate(entryData[option], entryData);
    });

    // Add the heading.
    entryMarkdown.push(interpolate(
      '<h3 id="${hash}">${entryLink}<code>${member}${separator}${call}</code></h3>\n' +
      interpolate(
        _([
          '${sourceLink}',
          _.get(options, 'sublinks', []),
          '${tocLink}'
        ])
        .flatten()
        .compact()
        .join(' '),
        entryData
      )
      .replace(/ {2,}/g, ' '),
      entryData
    ));

    // Add the description.
    entryMarkdown.push('\n' + entry.getDesc() + '\n');

    // Add optional since version.
    var since = entry.getSince();
    if (!_.isEmpty(since)) {
      entryMarkdown.push(
        '#### Since',
        since,
        ''
      );
    }
    // Add optional aliases.
    var aliases = entry.getAliases();
    if (!_.isEmpty(aliases)) {
      entryMarkdown.push(
        '#### Aliases',
        '*' +
        _.map(aliases, function(alias) {
          return interpolate('${member}${separator}${name}', {
            'member': member,
            'name': alias.getName(),
            'separator': separator
          });
        }).join(', ') +
        '*',
        ''
      );
    }
    // Add optional function parameters.
    var params = entry.getParams();
    if (!_.isEmpty(params)) {
      entryMarkdown.push('#### Arguments');
      _.each(params, function(param, index) {
        var paramType = param[0];
        if (_.startsWith(paramType, '(')) {
          paramType = _.trim(paramType, '()');
        }
        entryMarkdown.push(
          interpolate('${num}. `${name}` (${type}): ${desc}', {
            'desc': escape(param[2]),
            'name': param[1],
            'num':  index + 1,
            'type': escape(paramType)
          })
        );
      });
      entryMarkdown.push('');
    }
    // Add optional functions returns.
    var returns = entry.getReturns();
    if (!_.isEmpty(returns)) {
      var returnType = returns[0];
      if (_.startsWith(returnType, '(')) {
        returnType = _.trim(returnType, '()');
      }
      entryMarkdown.push(
        '#### Returns',
        interpolate('(${type}): ${desc}', {
          'desc': escape(returns[1]),
          'type': escape(returnType)
        }),
        ''
      );
    }
    // Add optional function example.
    var example = entry.getExample();
    if (example) {
      entryMarkdown.push('#### Example', example);
    }
    // End markdown for the entry.
    entryMarkdown.push('---\n\n<!-- /div -->');

    entry.markdown = entryMarkdown.join('\n');
  });

  // Add TOC headers.
  var tocGroups = _.keys(organized);
  if (byCategories) {
    // Remove special categories before sorting.
    var catogoriesUsed = _.intersection(tocGroups, specialCategories);
    _.pullAll(tocGroups, catogoriesUsed);

    // Sort categories and add special categories back.
    if (sortEntries) {
      tocGroups.sort(util.compareNatural);
    }
    push.apply(tocGroups, catogoriesUsed);
  }
  else {
    tocGroups.sort(util.compareNatural);
  }
  // Start markdown for TOC categories.
  var tocMarkdown = ['<!-- div class="toc-container" -->\n'];
  _.each(tocGroups, function(group) {
    tocMarkdown.push(
      '<!-- div -->\n',
      '## `' + group + '`'
    );

    if (sortEntries && organized[group]) {
      // Sort the TOC groups.
      organized[group].sort(function(value, other) {
        var valMember = value.getMembers(0),
            othMember = other.getMembers(0);

        return util.compareNatural(
          (valMember ? (valMember + getSeparator(value)) : '') + value.getName(),
          (othMember ? (othMember + getSeparator(other)) : '') + other.getName()
        );
      });
    }
    // Add TOC entries for each category.
    _.each(organized[group], function(entry) {
      var member = entry.getMembers(0) || '',
          name = entry.getName(),
          sep = getSeparator(entry),
          title = escape((member ? (member + sep) : '') + name);

      if (entry.isAlias()) {
        // An alias has a more complex html structure.
        var owner = entry.getOwner();
        tocMarkdown.push(
          '* <a href="#' + owner.getHash(style) + '" class="alias">`' +
          title + '` -> `' + owner.getName() + '`' +
          '</a>'
        );
      } else {
        // Add a simple TOC entry.
        tocMarkdown.push(
          '* ' +
          makeAnchor(
            '#' + entry.getHash(style),
            '`' + title + '`'
          )
        );
      }
    });
    tocMarkdown.push('\n<!-- /div -->\n');
  });

  // End markdown for the TOC.
  tocMarkdown.push('<!-- /div -->\n');

  var docMarkdown = ['# '+ options.title + '\n'];
  push.apply(docMarkdown, tocMarkdown);
  docMarkdown.push('<!-- div class="doc-container" -->\n');

  _.each(tocGroups, function(group) {
    docMarkdown.push('<!-- div -->\n');
    if (byCategories && !reSpecialCategory.test(group)) {
      var groupName = '“' + group + '” Methods';
    }
    docMarkdown.push('## `' + (groupName || group) + '`');
    _.each(organized[group], function(entry) {
      if (entry.markdown) {
        docMarkdown.push(entry.markdown);
      }
    });
   docMarkdown.push('\n<!-- /div -->\n');
  });

  docMarkdown.push('<!-- /div -->\n');

  // Add link back to the top of the TOC.
  var tocHref = _.get(options, 'tocHref', '#' + _.get(tocGroups, 0, '').toLowerCase());
  if (tocHref) {
    docMarkdown.push(' [1]: ' + tocHref + ' "Jump back to the TOC."\n');
  }
  return docMarkdown.join('\n');
}

module.exports = generateDoc;
