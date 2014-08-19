'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var request = require('request');
var _ = require('lodash');

module.exports = function (grunt, options, reportDirectory) {
  function startCoverageServer() {
    // start the jscover proxy server
    var cmd = 'java -jar "' + path.join(__dirname, 'jscover/JSCover-all.jar') + '" -ws --proxy --port=3128';
    var exec = require('child_process').exec;

    grunt.log.ok('JSCover proxy server started.');

    exec(cmd, function (err, stdout, stderr) {
      if (err) {
        console.log(err, stdout, stderr);
      }

      grunt.log.ok('JSCover proxy server terminated.');
    });
  }

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

    // get: function (reportFileName, sourceFile, cb) {
    //   var file = path.join(options.coverageReportDirectory, reportFileName);

    //   fs.readFile(file, function (err, jsonCov) {
    //     if (err) {
    //       cb(err);
    //     } else if (sourceFile) {
    //       var coverageJson = JSON.parse(jsonCov);

    //       if (coverageJson[req.query.file]) {
    //         cb(null, coverageJson[req.query.file]);
    //       } else {
    //         cb('No coverage data for desired source file.');
    //       }
    //     } else {
    //       cb(null, jsonCov);
    //     }
    //   });
    // },

    save: function (coverageData, cb) {
      _.merge(collector, JSON.parse(coverageData));
      cb(null);
    },

    aggregate: function (cb) {
      fs.writeFile(path.join(reportDirectory, 'jscover.json'), JSON.stringify(collector), cb);
    }
  };
};