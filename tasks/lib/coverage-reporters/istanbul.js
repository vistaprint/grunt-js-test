'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');
var istanbul = require('istanbul');

module.exports = function (grunt, options, reportDirectory) {
  var instrumenter = new istanbul.Instrumenter();
  var collector = new istanbul.Collector();

  return {
    start: function () {
      var app = express();

      app.use(options.baseUri, function (req, res) {
        var file = path.join(options.root, req.path);

        // if we're not requesting a JS file, do not instrunment it
        if (path.extname(file) != '.js') {
          //Allow cross-origin resource requests during testing (e.g. handlebars templates)
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With');
          res.sendFile(file);
          return;
        }

        fs.readFile(file, function (err, contents) {
          if (err) {
            res.status(404).send({
              success: false,
              message: 'Requested file was not found.'
            });

            grunt.log.error('Failed to read requested file to instrument.', err);
            return;
          }

          instrumenter.instrument(contents.toString(), path.join(options.root, req.path), function (err, instrumentedCode) {
            if (err) {
              res.status(500).send({
                success: false,
                message: 'Failed to instrument code.'
              });

              grunt.log.error('Failed to instrument code.', err);
            } else {
              res.set('Content-Type', 'text/javascript');
              res.status(200).send(instrumentedCode);
            }
          });
        });
      });

      var server = app.listen(options.coverageProxyPort);

      grunt.log.ok('Started proxy web server on port ' + options.coverageProxyPort + '.\n');

      return server;
    },

    save: function (coverageData, cb) {
      collector.add(JSON.parse(coverageData));
      cb(null);
    },

    aggregate: function (cb) {
      var reporter = new istanbul.Reporter(null, reportDirectory);

      reporter.add('html');

      reporter.write(collector, true, function () {
        grunt.verbose.writeln('Generated coverage report to: ' + reportDirectory);
        cb(null);
      });
    }
  };
};
