var fs = require('fs');
var path = require('path');
var moment = require('moment');

module.exports = function (options) {
  var JSCOVERAGE = path.resolve('./jscoverage ' + moment().format('YYYY-MM-DD') + '.json');

  return {

    getCoverageData: function () {
      try {
        return fs.readFileSync(JSCOVERAGE);
      } catch (ex) {
        return null;
      }
    },

    jscoverageFile: function (reportFileName) {
      if (reportFileName) {
        return path.resolve('./' + reportFileName);
      }

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