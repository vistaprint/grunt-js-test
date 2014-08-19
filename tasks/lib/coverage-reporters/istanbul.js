'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');
var istanbul = require('istanbul');

module.exports = function (grunt, options) {
  var app = express();
  // app.use('/_coverage', im.createHandler());
  // app.use(options.baseUri, im.createClientHandler(options.root));

  var instrumenter = new istanbul.Instrumenter();

  app.use(options.baseUri, function (req, res, next) {
    var file = path.join(options.root, req.path);

    fs.readFile(file, function (err, contents) {
      if (err) {
        res.status(404).send({
          success: false,
          message: 'Requested file was not found.'
        });

        grunt.log.error('Failed to read requested file to instrument.', err);
        return;
      }

      instrumenter.instrument(contents.toString(), req.path, function (err, instrumentedCode) {
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

  app.listen(options.coverageProxyPort);

  grunt.log.ok('Started proxy web server on port ' + options.coverageProxyPort + '.\n');
};