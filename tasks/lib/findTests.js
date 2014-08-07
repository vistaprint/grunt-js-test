'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');
var glob = require('glob');

// convert an array of strings into an array of regular expressions
function getRegExs(list) {
  // if the list is already an array, just map the strings
  // to regular expressions
  if (Array.isArray(list)) {
    return list.map(function (regex) {
      return new RegExp(regex);
    });
  }
  // if the "list" is a string, assume it's a single regular expression
  else if (typeof list === 'string') {
    return [new RegExp(list)];
  }
  // if there is anything else being passed, throw an error
  else if (list !== undefined) {
    console.error('Error: Invalid configuration for projects.json (include or exclude is invalid).');
    process.exit(1);
  }
  // otherwise, there is nothing to convert
  else {
    return null;
  }
}

module.exports = function findTests(options) {
  // override some things
  var include = getRegExs(options.include);
  var exclude = getRegExs(options.exclude);

  var files = [];

  var root = path.resolve(options.root);

  // look for all unit test files
  var files = [];

  // go through the list of glob patterns
  if (!Array.isArray(options.pattern)) {
    options.pattern = [options.pattern];
  }

  options.pattern.forEach(function (pattern) {
    files = files.concat(
      glob.sync(pattern, {
        cwd: root,
        nosort: true
      })
    );
  });

  // filter out paths by the inclusive "include" option
  if (include) {
    files = files.filter(function (file) {
      return include.every(function (regEx) {
        if (typeof regEx === 'string') {
          return file.toLowerCase().indexOf(regEx.toLowerCase()) > -1;
        } else {
          return regEx.test(file);
        }
      });
    });
  }

  // filter out paths by the "exclude" option
  if (exclude) {
    files = files.filter(function (file) {
      return !exclude.every(function (regEx) {
        if (typeof regEx === 'string') {
          return file.toLowerCase().indexOf(regEx.toLowerCase()) > -1;
        } else {
          return regEx.test(file);
        }
      });
    });
  }

  // add test to the tests
  return files.map(function (file, fileNum) {
    var injectFiles = [];
    var abs = path.join(root, file);
    var dir = path.dirname(abs);
    var url = '/test/' + fileNum + '?js=' + file;

    var lines = fs.readFileSync(abs, {encoding: 'utf8'}).toString().split('\n').map(function (line) {
      return line.replace(/^\s+/, '').replace(/\s+$/, '');
    });

    var inject = new RegExp(/\/\/\/\s*<inject\s*path=['|"]([^'"]+)['|"]\s*\/>/i);
    var reference = new RegExp(/\/\/\/\s*<reference.+path=['|"]([^'"]+)['|"].*\/>/i);

    lines.every(function (line) {
      // ignore empty lines
      if (line.length === 0) {
        return true;
      }

      // ignore comments /* */
      if (line.substr(0, 2) === '/*') {
        return true;
      }

      // ignore <reference> tags
      if (reference.test(line)) {
        return true;
      }

      // parse comments beginning with /// <inject path="">
      var match = inject.exec(line);
      if (match) {
        var injectFile = path.normalize(path.join(dir, match[1]));
        injectFiles.push(injectFile);
        return true;
      }

      // stop processing the file
      return false;
    });

    if (fs.existsSync(abs.replace(/\.js$/, '.inject.html'))) {
      injectFiles.push(abs.replace(/\.js$/, '.inject.html'));
    }

    return {
      url: url,
      file: file,
      filename: path.basename(file),
      dir: dir,
      abs: abs,
      injectFiles: injectFiles
    };
  }).sort(function (a, b) {
    a = a.file.toLowerCase();
    b = b.file.toLowerCase();

    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  });
};
