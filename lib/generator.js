var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    docdownEntry = require('./entry.js');
    Entry =  docdownEntry.Entry,
    getEntries =  docdownEntry.getEntries,
    escapeRegExp = docdownEntry.escapeRegExp;
    
/**
 * Escape special chars for markdown
 *
 *  @param {string} string to escape
 *  
 */
function markdownEscape(str) {
  str = str.replace(/\*/,'&#42;')
    .replace(/_/,'&#95;')
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
 * Get the seperator (. or .prototype.)
 *
 * @param {entry object} Entry object to get selector for
 * 
 */
function getSeparator(entry) {
  return entry.isPlugin() ? '.prototype.' : '.';
}

/**
 * builds the documentation from JS source
 *
 * @param {string} entire source code
 * @param {object} Options object
 * 
 */
function buildDoc(source,options) {
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
        
        
        anEntry.markdown.push(
          '### '+
          makeHashHTML(theHash,'id')+
          '`'+(anEntry.getMembers(0) ? (anEntry.getMembers(0) + getSeparator(anEntry))  : '')+anEntry.getCall()+

          '`');
        anEntry.markdown.push(
          //for permalinking
          makeHashHTML(theHash,'href','#')+
          //line numbers
          ' [&#x24C8;]('+
          url+
          '#L'+
          anEntry.getLineNumber()+
          ' "View in source") '+
          '[&#x24C9;][1]'
        );
        
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
              index+1+
              '. '+
              '`'+anArgument[1]+'` '+
              '*('+markdownEscape(anArgument[0])+')*'+ //escape this
              ': '+
              anArgument[2]
            )
          })
        }
        anEntry.markdown.push('');
        
        //fn returns (optional)
        theReturns = anEntry.getReturns();
        if (theReturns.length > 0) {
          anEntry.markdown.push('#### Returns');
          anEntry.markdown.push(
            '*('+
            markdownEscape(theReturns[0])+
            ')*: '+
            theReturns[1]
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
  
  tocGroups.sort();
  
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
    organizedEntries[aGroup].sort(function(a,b) {
      if (a.getCall() > b.getCall())
        return 1;
      if (a.getCall() < b.getCall())
        return -1;
      // a must be equal to b
      return 0; 
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
            markdownEscape(
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
              markdownEscape(
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
    output += '<!-- div -->\n';
    if (options.toc === 'categories') {
      output += '## `"'+aGroup+'" Methods`';
    } else {
      output += '## '+aGroup+'`';
    }
    
    organizedEntries[aGroup].forEach(
      function(anEntry) {
        if (anEntry.markdown) {
          output += anEntry.markdown;
        }
      }
    );
   output += '<!-- /div -->\n\n';
  });
    
    
  //back to top  
  output += ' [1]: #'+tocGroups[0].toLowerCase()+' "Jump back to the TOC."\n';
  
  return output;
  
}

function docdown(options) {
  var
    defaults,
    output;
    
  if ((!options.path) || (!options.url)){
    throw "Path and/or url not specified for docdown";
  }
  defaults = {
    toc   : 'properties',
    lang  : 'js',
    title : path.basename(options.path) + ' API documentation'
  };
  options = _.assign(defaults, options);
  
  output = '# '+ options.title + '\n\n' + buildDoc(fs.readFileSync(options.path,'utf8'), options);
  
  return output;
  
}

module.exports = docdown;