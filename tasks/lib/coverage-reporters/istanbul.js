'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');
var istanbul = require('istanbul');
var Minimatch = require('minimatch').Minimatch;

module.exports = function (grunt, options, reportDirectory) {
  var instrumenter = new istanbul.Instrumenter();
  var collector = new istanbul.Collector();
  var excludeMatch;
  if (options.istanbul && options.istanbul.excludes) {
    excludeMatch = new Minimatch(options.istanbul.excludes);
  }

  return {
    start: function () {
      var app = express();

      app.use(options.baseUri, function (req, res) {
        var file = path.join(options.root, req.path);

        // if we're not requesting a JS file, do not instrument it
        if ((path.extname(file) != '.js') || (excludeMatch && excludeMatch.match(file))) {
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

          instrumenter.instrument(contents.toString(), path.join(options.root, req.path), function (err2, instrumentedCode) {
            if (err2) {
              res.status(500).send({
                success: false,
                message: 'Failed to instrument code.'
              });

              grunt.log.error('Failed to instrument code.', err2);
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

    aggregate: function (format, cb) {
      var reporter = new istanbul.Reporter(null, reportDirectory);

      // Default to html if no format provided as this was the prior default
      format = format || 'html';
      reporter.add(format);

      reporter.write(collector, true, function () {
        grunt.verbose.writeln('Generated coverage report to: ' + reportDirectory);
        cb(null);
      });
    }
  };
};
