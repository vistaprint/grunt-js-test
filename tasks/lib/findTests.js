'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');

module.exports = function findTests(grunt, options) {
  var utils = require('./utils')(options);

  // go through the list of glob patterns
  if (!Array.isArray(options.pattern)) {
    options.pattern = [options.pattern];
  }

  // glob for test files
  var files = grunt.file.expand({
    cwd: options.root
  }, options.pattern);

  // filter out paths by the inclusive "include" option
  if (Array.isArray(options.include) && options.include.length > 0) {
    files = files.filter(function (file) {
      return options.include.every(function (regEx) {
        if (typeof regEx === 'string') {
          return file.toLowerCase().indexOf(regEx.toLowerCase()) > -1;
        } else {
          return regEx.test(file);
        }
      });
    });
  }

  // filter out paths by the "exclude" option
  if (Array.isArray(options.exclude) && options.exclude.length > 0) {
    files = files.filter(function (file) {
      return !options.exclude.every(function (regEx) {
        if (typeof regEx === 'string') {
          return file.toLowerCase().indexOf(regEx.toLowerCase()) > -1;
        } else {
          return regEx.test(file);
        }
      });
    });
  }

  // add test to the tests
  return files.sort(function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  }).map(function (file, fileNum) {
    var abs = path.join(options.root, file);
    var dir = path.dirname(abs);
    var url = '/test/' + fileNum + '?js=' + file;

    var injectFiles = [];

    if (options.referenceTags) {
      injectFiles = utils.findReferenceTags(abs).filter(function (reference) {
        return path.extname(reference) === '.html';
      });
    }

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
  });
};
