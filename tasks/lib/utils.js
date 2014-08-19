'use strict';

var fs = require('fs');
var path = require('path');
var moment = require('moment');

function normalize(file) {
  return path.normalize(file).toLowerCase();
}

module.exports = function (options) {
  return {

    coverageReportDirectory: function () {
      // ensure the coverage report directory exists
      if (!options.coverageReportDirectory) {
        options.coverageReportDirectory = path.join(process.cwd(), 'coverage');
      }

      if (!fs.existsSync(options.coverageReportDirectory)) {
        fs.mkdirSync(options.coverageReportDirectory);
      }

      var identifier = moment().format('YYYY-MM-DD HHMMSS');
      var reportDirectory = path.join(options.coverageReportDirectory, identifier);

      return reportDirectory;
    },

    findReferenceTags: function (files) {
      // ensure files is an array
      if (!Array.isArray(files)) {
        files = [files];
      }

      // standardize all paths to be non-case sensitive
      files = files.map(normalize);

      // a {file: dependencies} dictionary object
      var data = {};

      function findDeps(filePath) {
        var re = /\/\/\/\s*<reference.+path=\"(.+)\".*\/>/gi;
        var contents = fs.readFileSync(filePath, {encoding: 'utf8'});
        var deps = [];
        var match;

        while ((match = re.exec(contents))) {
          deps.push(
            normalize(path.join(path.dirname(filePath), match[1]))
          );
        }

        return deps;
      }

      function recursive(file) {
        var deps = findDeps(file);
        data[file] = deps;
        deps.forEach(recursive);
      }

      // go through each file we need and find their dependencies, recursively
      files.forEach(recursive);

      var included = {};

      function include(name) {
        // confirm this file has not been included
        if (included[name]) {
          return;
        }

        if (typeof data[name] === 'undefined') {
          grunt.log.error('Script ' + name + ' not found!');
          return;
        }

        // include all deps before including this
        data[name].forEach(include);

        // mark this file as being included so we do not re-include
        included[name] = true;
      }

      files.forEach(include);

      // optionally remove the files and only return the deps for the file
      if (options.requirejs) {
        files.forEach(function (file) {
          delete included[file];
        });
      }

      // convert a provided dependency (which is an absolute file path)
      // to web-accessible URIs for the given location
      function resolveReferenceTag(dep) {
        return path.join(options.baseUri, path.relative(options.root, dep)).replace(/\\/g, '/');
      }

      // the included object will now be the sorted dependencies
      return Object.keys(included).map(resolveReferenceTag);
    }

  };
};