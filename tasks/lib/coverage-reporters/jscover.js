'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var request = require('request');
var _ = require('lodash');

module.exports = function (grunt, options, reportDirectory) {
  var startCoverageServer = function (format) {
    // start the jscover proxy server
    var cmd = 'java -jar "' + path.join(__dirname, 'jscover/jscover-all.jar') + '" -ws --proxy --port=3128';
    if (format) {
      cmd += ' --format=' + format;
    }
    var exec = require('child_process').exec;

    grunt.log.ok('JSCover proxy server started.');

    exec(cmd, function (err, stdout, stderr) {
      if (err) {
		/*eslint-disable no-console */
        console.log(err, stdout, stderr);
		/*eslint-enable no-console */
      }

      grunt.log.ok('JSCover proxy server terminated.');
    });
  };

  var collector = {};

  return {
    start: function () {
      // turn on java server to act as a proxy
      startCoverageServer();

      // setup http request utility that uses a proxy
      var r = request.defaults({'proxy': 'http://127.0.0.1:3128'});

      var proxy = http.createServer(function (req, resp) {
        grunt.verbose.writeln('Coverage Proxy Request:', req.url);
        r.get('http://' + options.hostname + ':' + options.staticPort  + req.url).pipe(resp);
      });

      proxy.listen(options.coverageProxyPort);

      grunt.log.ok('Started proxy web server on port ' + options.coverageProxyPort + '.\n');
    },

    save: function (coverageData, cb) {
      _.merge(collector, JSON.parse(coverageData));
      cb(null);
    },

    aggregate: function (format, cb) {
      fs.writeFile(path.join(reportDirectory, 'jscover.json'), JSON.stringify(collector), cb);
    }
  };
};
