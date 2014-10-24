'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var _ = require('lodash');

var app = express();

app.locals.pretty = true; // output pretty HTML
app.set('views', path.join(__dirname, '..', '..', 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.text({ limit: '200mb' }));
// app.use(express.errorHandler());

// proxy static js-test-env javascript files
app.use('/js-test-env', express.static(path.join(__dirname, '..', '..', 'views', 'deps')));

module.exports = function (grunt, options) {
  var tests = require('./findTests')(grunt, options);
  var utils = require('./utils')(grunt, options);

  // set template data
  app.locals.tests = tests;
  app.locals.options = options;
  app.locals.utils = utils;
  app.use(function (req, res, next) {
    res.locals.coverage = typeof req.query.coverage !== 'undefined';
    res.locals.defaultBaseUri = '//' + req.hostname + ':' + options.port;
    res.locals.projectBaseUri = '//' + req.hostname + ':' + (res.locals.coverage ? options.coverageProxyPort : options.staticPort) + '/';
    next();
  });

  // start static file server
  app.staticServer = require('./staticServer')(grunt, options);

  // start coverage instrumentation proxy server
  var coverageTool, coverageReportDirectory, createdCoverageReportDirectory;
  if (options.coverage) {
    try {
      coverageReportDirectory = utils.coverageReportDirectory();
      coverageTool = require('./coverage-reporters/' + options.coverageTool)(grunt, options, coverageReportDirectory);
    } catch (ex) {
      options.coverageTool = null;
      options.coverage = false;
      grunt.log.error('Unsupported coverage reporter, disabling coverage.');
    } finally {
      app.coverageServer = coverageTool.start();
    }
  }

  // list of unit tests
  app.get('/', function (req, res) {
    res.render('index');
  });

  // store the jscover report to disk
  app.post('/jscoverage.json', function (req, res) {
    // we need data to write to the file
    if (!req.body) {
      grunt.log.error('No Coverage JSON data provided in POST, should never happen.');
      return res.status(500).send('No JSON data provided.');
    }

    if (!createdCoverageReportDirectory) {
      fs.mkdirSync(coverageReportDirectory);
      createdCoverageReportDirectory = true;
    }

    coverageTool.save(req.body, function (err) {
      if (err) {
        grunt.log.error('Failed to save coverage data.');
        res.status(500).send({ success: false });
      } else {
        grunt.verbose.writeln('Saved coverage data.');
        res.status(200).send({ success: true });
      }
    });
  });

  app.saveCoverageReport = function (cb) {
    coverageTool.aggregate(function (err) {
      cb(err);
    });
  };

  app.get('/save-coverage-data', function (req, res) {
    app.saveCoverageReport(function (err) {
      if (err) {
        grunt.log.error('Failed to create coverage report.');
        res.status(500).send({ success: false });
      } else {
        grunt.verbose.writeln('Saved coverage report.');
        res.status(200).send({ success: true });
      }
    });
  });

  // run all tests for a given project
  app.get('/all', function (req, res) {
    // we run each each test in isolation, which creates an iframe
    // to /test/:test for each test
    res.render('all', {
      coverage: typeof req.query.coverage !== 'undefined'
    });
  });

  // run a single test given the index number
  app.get('/test', function (req, res) {
    var test = _.filter(tests, function (test) {
      return req.query.js == test.file;
      // return test.originalUrl == req.path;
    });

    // if we do not have this test, 404?
    if (test.length == 0) {
      return res.status(404).send('Test not found.');
    } else {
      test = test[0];
    }

    // array of stylesheets to include in test page
    var stylesheets = options.stylesheets;

    // array of javascript files to include in test page
    var references = options.referenceTags ? utils.getDependencies(test.abs) : [];

    // determine if we want to generate coverage reports
    var coverage = typeof req.query.coverage !== 'undefined';

    // module name, used if this is a requirejs project
    var moduleName = (function () {
      if (options.requirejs) {
        return path.relative(options.modulesRelativeTo || options.root, test.abs).replace(/\\/g, '/').replace(/\.js$/, '');
      } else {
        return null;
      }
    }());

    // render the output of the http request
    var render = function (injectHTML) {
      res.render('test', {
        modules: moduleName || '',
        injectHTML: injectHTML,
        test: test,
        deps: references.js,
        stylesheets: stylesheets,
        coverage: coverage,
        phantom: req.query.phantom
      });
    };

    var injectHTML = options.injectHTML || '';

    // if we support reference tags, handle any found *.html and *.css reference tags
    if (options.referenceTags) {
      stylesheets = stylesheets.concat(_.map(references.css, utils.getDependencyUri));

      references.html.forEach(function (reference) {
        injectHTML += fs.readFileSync(reference);
      });
    }

    // look for a *.inject.html, if we find one, inject it
    try {
      // we do not check if the file exists, as that would result in two I/O hits
      // instead, just try to read it, if it throws an error, then ignore the error
      injectHTML += fs.readFileSync(test.abs.replace(/\.js$/, '.inject.html'));
    } catch (ex) {
      // no .inject.html exists, most likely, so move on
    }

    // if the test has an inject URL, request it and inject it
    if (options.injectServer) {
      var injectUrl = options.injectServer + '?file=' + test.file; // TODO: sanitize the injectUrl

      request(injectUrl, function (err, res, body) {
        if (err) {
          grunt.log.error('Inject server request failed', err);
          if (typeof body !== 'string') {
            body = '';
          }
        }

        render(injectHTML + body);
      });
    } else {
      // no inject url, so we have all the inject HTML we need, most tests go here, just render the response
      render(injectHTML);
    }
  });

  return app;
};
