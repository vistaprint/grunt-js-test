'use strict';

// Wrapper for path.normalize() that makes paths lowercase on Windows, because the filesystem is not case sensitive.

var path = require('path');

var normalize = function (file) {
  return path.normalize(file);
};

if (/^win/.test(process.platform)) {
  normalize = function (file) {
    return path.normalize(file).toLowerCase();
  };
}

module.exports = normalize;
