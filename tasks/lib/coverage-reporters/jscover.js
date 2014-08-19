'use strict';

var path = require('path');
var http = require('http');
var request = require('request');

module.exports = function (grunt, options) {
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
};