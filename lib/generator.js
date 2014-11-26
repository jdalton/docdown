var _ = require('lodash'),
    Entry = require('./entry.js');
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
  contents = contents ? contents : '';
  return '<a '+attr+'="'+
    attrValue+
    '">'+contents+'</a>';
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
 * @param {entry object} Entry object to get selector for
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
 * @param {string} entire source code
 * @param {object} Options object
 *
 */
function generateDoc(source,options) {
  var
    url = options.url,
    entries = getEntries(source),
    api = [],
    organizedEntries = {},
    categories,
    members = {},
    indexMarkdown = [],
    tocGroups,
    output = '';

  //build the entries
  entries.forEach(function(anEntry) {
    api.push(new Entry(anEntry,source));
  });

  //resolve the aliases
  api.forEach(function(anEntry){
    var
      aliases;

    aliases = anEntry.getAliases();
    if (aliases) {
      aliases.forEach(function(anAlias) {
        api.push(anAlias);
      });
    }
  });

  //build the categories
  api.forEach(function(anEntry){
    var
      theCategory,
      memberGroup,
      theMember;

    if ((!anEntry.isPrivate()) &&
        (anEntry.getName())) {
      theMember = anEntry.getMembers(0);

      if (options.toc === 'categories') {
        //by category
        theCategory = anEntry.getCategory();
        if (!organizedEntries[theCategory]) {
          organizedEntries[theCategory] = [];
        }
      } else {
        //by "membership"
        memberGroup = theMember;

        if ((!theMember )||
            (anEntry.isCtor()) ||
            (anEntry.getType() == 'Object' &&
               !anEntry.entry.match(/[=:]\s*(?:null|undefined)\s*[,;]?$/gi))) {
         //something? can't figure out why.
        } else if (!anEntry.isCtor()) {
          memberGroup = (theMember + getSeparator(anEntry)).slice(0,-1); //weird trailing .
        }
        if ((theMember)
            && (!anEntry.isPrivate())) {
          if (!organizedEntries[memberGroup]) {
            organizedEntries[memberGroup] = [];
          }
        }

      }
    }
  });

  api.forEach(function(anEntry){
    var
      theExample,
      theArguments,
      theReturns,
      theCategory,
      theMember,
      members,
      memberGroup,
      theHash,
      tocEntry;

    theMember = anEntry.getMembers(0);

    if (theMember) {
      memberGroup = theMember;
    } else if (anEntry.getName() && (!anEntry.isPrivate())) {
      //considition like _(value)
      memberGroup = _.first(anEntry.getName().split('('));
      theMember = memberGroup;
    }

    if (anEntry.getName() && (!anEntry.isPrivate())) {
      members = anEntry.getMembers().length ? anEntry.getMembers() : [''];

      if ((!theMember )||
          (anEntry.isCtor()) ||
          (anEntry.getType() == 'Object' &&
             !anEntry.entry.match(/[=:]\s*(?:null|undefined)\s*[,;]?$/gi))) {
       //something? can't figure out why.
      } else if (anEntry.isStatic()) {
        //something? can't figure out why.
      } else if (!anEntry.isCtor()) {
        memberGroup = (theMember + getSeparator(anEntry)).slice(0,-1); //weird trailing '.'
      }
    }

    if ((!anEntry.isPrivate()) &&
        (anEntry.getName())) {
      //aliases don't get a description
      if (!anEntry.isAlias()) {
        anEntry.markdown = [];
        //start
        anEntry.markdown.push('<!-- div -->\n');

        //fn heading
        theHash = theMember+anEntry.getHash();
        anEntry.theHash = theHash;

        var result = interpolate([
          '### <a id="${hash}"></a>`${member}${separator}${call}`\n',
          '<a href="#${hash}">#</a> ',
          '[&#x24C8;](${href} "View in source") ',
          '[&#x24C9;][1]'
        ].join(''), {
            'call':      anEntry.getCall(),
            'hash':      theHash,
            'href':      url + '#L' + anEntry.getLineNumber(),
            'member':    anEntry.getMembers(0),
            'separator': getSeparator(anEntry)
        });

        anEntry.markdown.push(result);

        anEntry.markdown.push(''); //new line

        //fn description
        anEntry.markdown.push(anEntry.getDesc());
        anEntry.markdown.push('');

        //fn arguments (optional)
        theArguments = anEntry.getParams();
        if (theArguments.length > 0) {
          anEntry.markdown.push('#### Arguments');
          theArguments.forEach(function(anArgument, index) {
            anEntry.markdown.push(
              interpolate('${num}. `${name}` (${type}): ${desc}', {
                'desc': escape(anArgument[2]),
                'name': anArgument[1],
                'num':  index + 1,
                'type': escape(anArgument[0])
              })
            );
          });
        }
        anEntry.markdown.push('');

        //fn returns (optional)
        theReturns = anEntry.getReturns();
        if (theReturns.length > 0) {
          anEntry.markdown.push('#### Returns');
          anEntry.markdown.push(
            interpolate('(${type}): ${desc}', {
              'desc': escape(theReturns[1]),
              'type': escape(theReturns[0])
            })
          );
          anEntry.markdown.push('');
        }


        //fn example
        theExample = anEntry.getExample();
        if (theExample) {
          anEntry.markdown.push('#### Example\n'+theExample);
        }

        //tail
        anEntry.markdown.push('\n* * *\n');
        anEntry.markdown.push('<!-- /div -->\n\n');

        anEntry.markdown = anEntry.markdown.join('\n');
      }

      //by category
      if (options.toc === 'categories') {
        //place it into a category
        theCategory = anEntry.getCategory();

        organizedEntries[theCategory].push(anEntry);
      } else {
        //by "membership"
        if ((theMember)
            && (!anEntry.isPrivate())) {
          tocEntry = anEntry.getMembers(0)+
              getSeparator(anEntry)+
              anEntry.getName();
          //so if the name of the entry matches a category, just place it directly in the the category
          if (Object.keys(organizedEntries).indexOf(tocEntry) !== -1) {
            organizedEntries[tocEntry].push(anEntry);
          } else {
            organizedEntries[memberGroup].push(anEntry);
          }


        }
      }
    }
  });


  //toc
  tocGroups = Object.keys(organizedEntries);

  tocGroups.sort(utils.compareNatural);

  tocGroups.forEach(function(aGroup) {
    //toc category head
    indexMarkdown.push(
      '<!-- div -->\n',
      '## '+
      makeHashHTML(aGroup.toLowerCase(),
        'id'
      )+
      '`'+aGroup+'`'
    );

    //sort the groups
    organizedEntries[aGroup].sort(function(a, b) {
      return utils.compareNatural(a.getCall(), b.getCall());
    });

    //entries for each category
    organizedEntries[aGroup].forEach(
      function(anIndexEntry) {

        if (anIndexEntry.isAlias()) {
          //alias has a more complex html structure
          indexMarkdown.push(
            '* <a href="'+
            '#'+anIndexEntry.getOwner().theHash+
            '" class="alias">'+
            escape(
              anIndexEntry.getMembers(0)+
              getSeparator(anIndexEntry)+
              anIndexEntry.getName()
            )+
            ' -> '+anIndexEntry.getOwner().getName()+
            '</a>'
          );
        } else {
          //simiple toc entry
          indexMarkdown.push(
            '* '+
            makeHashHTML(
              '#'+anIndexEntry.theHash,
              'href',
              escape(
                (anIndexEntry.getMembers(0) ? (anIndexEntry.getMembers(0) + getSeparator(anIndexEntry))  : '') +
                anIndexEntry.getName()
              )
            )
          );
        }
      }
    );
  });


  //wrapup toc section
  indexMarkdown.push('\n<!-- /div -->\n')
  output += indexMarkdown.join('\n');

  tocGroups.forEach(function(aGroup) {
    output += '\n<!-- div -->\n';
    if (options.toc === 'categories') {
      output += '## `"'+aGroup+'" Methods` \n';
    } else {
      output += '## `'+aGroup+'` \n';
    }

    organizedEntries[aGroup].forEach(
      function(anEntry) {
        if (anEntry.markdown) {
          output += anEntry.markdown;
        }
      }
    );
   output += '\n<!-- /div -->\n\n';
  });


  //back to top
  //output += ' [1]: #'+tocGroups[0].toLowerCase()+' "Jump back to the TOC."\n';

  return output;

}

module.exports = generateDoc;
