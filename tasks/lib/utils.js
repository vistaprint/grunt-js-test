var fs = require('fs');
var path = require('path');

module.exports = function (options) {
  var JSCOVERAGE = path.resolve('./jscoverage.json');

  return {

    getCoverageData: function () {
      try {
        return fs.readFileSync(JSCOVERAGE);
      } catch (ex) {
        return null;
      }
    },

    jscoverageFile: function () {
      return JSCOVERAGE;
    },

    jscoverageFileExists: function () {
      return fs.existsSync(this.jscoverageFile());
    },

    // convert a provided dependency (which is an absolute file path)
    // to web-accessible URIs for the given location
    resolveReferenceTag: function (dep) {
      return path.join(options.baseUri, path.relative(options.root, dep)).replace(/\\/g, '/');
    }

  };
};