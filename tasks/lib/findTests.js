'use strict';

// Nodejs libs.
var path = require('path');
var normalize = require('./normalize');

module.exports = function findTests(grunt, options) {
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
          return normalize(file).indexOf(normalize(regEx)) > -1;
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
          return normalize(file).indexOf(normalize(regEx)) > -1;
        } else {
          return regEx.test(file);
        }
      });
    });
  }

  // add test to the tests
  return files.sort(function (a, b) {
    a = normalize(a);
    b = normalize(b);

    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  }).map(function (file) {
    var abs = path.join(options.root, file);
    var uri = '/test?js=' + file;
    var url = 'http://' + options.hostname + ':' + options.port + uri;

    // if we're generating coverage data, let the server know specifically we want to do it right now
    if (options.coverage) {
      url += '&coverage=1';
    }

    // if there are extra query string arguments to add, add them
    if (options.injectQueryString) {
      url += '&' + options.injectQueryString;
    }

    url += '&phantom=1';

    return {
      uri: uri,
      url: url,
      file: file,
      filename: path.basename(file),
      dir: path.dirname(abs),
      abs: abs
    };
  });
};
