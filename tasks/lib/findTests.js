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

function Project(project) {
  // merge all the config from the projects.json into the project object
  for (var key in project) {
    if (project.hasOwnProperty(key)) {
      this[key] = project[key];
    }
  }

  // override some things
  this.include = getRegExs(project.include);
  this.exclude = getRegExs(project.exclude);
}

Project.prototype.findTests = function () {
  // var re = /tests\.js$/;
  var root = path.resolve(this.root);

  // look for all unit test files
  var files = glob.sync(this.pattern, {
    cwd: root,
    nosort: true
  });
    // make sure all files are *tests.html or *tests.js
    // .filter(re.test.bind(re));

  // filter out paths by the inclusive "include" option
  if (this.include) {
    files = files.filter(function (file) {
      return this.include.every(function (regEx) {
        return regEx.test(file);
      });
    }, this);
  }

  // filter out paths by the "exclude" option
  if (this.exclude) {
    files = files.filter(function (file) {
      return this.exclude.every(function (regEx) {
        return !regEx.test(file);
      });
    }, this);
  }

  // add test to the tests
  return files.map(function (file, fileNum) {
    var url;
    var injectFiles = [];
    var abs = path.join(root, file);
    var dir = path.dirname(abs);

    url = '/test/' + fileNum + '?js=' + file;

    if (!this.injectServer) {
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

        // parse comments beginning with /// <inject file="">
        var match = inject.exec(line);
        if (match) {
          var injectFile = path.normalize(path.join(dir, match[1]));
          injectFiles.push(injectFile);
          return true;
        }

        return false;
      });

      if (fs.existsSync(abs.replace(/\.js$/, '.inject.html'))) {
        injectFiles.push(abs.replace(/\.js$/, '.inject.html'));
      }
    }

    return {
      url: url,
      file: file,
      filename: path.basename(file),
      dir: dir,
      abs: abs,
      injectFiles: injectFiles,
      injectUrl: this.injectServer ? this.injectServer + '?file=' + file : null
    };
  }, this);
};

// return a sorted the list of tests
Project.prototype.tests = function () {
  return this.findTests().sort(function (a, b) {
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

module.exports = function findTests(options) {
  return new Project(options).findTests();
};
