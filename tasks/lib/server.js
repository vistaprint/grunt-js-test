'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

app.locals.pretty = true; // output pretty HTML
app.set('views', path.join(__dirname, '..', '..', 'views'));
app.set('view engine', 'jade');
// app.use(express.logger('dev'));
app.use(bodyParser.text({ limit: '200mb' }));
// app.use(express.errorHandler());

// proxy static js-test-env javascript files
app.use('/js-test-env', express.static(path.join(__dirname, '..', '..', 'views', 'deps')));

module.exports = function (grunt, options) {
  var tests = require('./findTests')(options);
  var utils = require('./utils')(options);

  // validate coverage reporting tool
  if (options.coverageTool !== 'jscover' && options.coverageTool !== 'istanbul') {
    options.coverageTool = null;
    options.coverage = false;
    grunt.log.error('Unsupported coverage reporter, disabling coverage.');
  }

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

  // create a static file server for project assets
  var statics = express();

  // ensure all responses are utf8 and are accessible cross-domain
  // this is needed so we can perform ajax requests to get the contents
  // of these static files from within the coverage report viewer
  statics.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
  });

  statics.use(options.baseUri, express.static(options.root));
  statics.listen(options.staticPort);

  // start coverage instrumentation proxy server
  if (options.coverage) {
    require('./coverage-reporters/' + options.coverageTool)(grunt, options);
  }

  // list of unit tests
  app.get('/', function (req, res) {
    res.render('index');
  });

  // coverage report viewer
  app.get('/coverage', function (req, res) {
    var coverageReports = grunt.file.expand(path.join(options.coverageReportDirectory, '.json'));

    if (options.coverageTool == 'jscover') {
      res.render('jscoverage', {
        coverageReports: coverageReports,
        report: req.query.report
      });
    }
  });

  // jscoverage json report for a given project
  app.get('/jscoverage.json', function (req, res) {
    if (!req.query.report) {
      res.status(404).send({
        success: false,
        message: 'No report specified.'
      });
      return;
    }

    var f = utils.jscoverageFile(req.query.report);
    if (req.query.file) {
      fs.readFile(f, function (err, data) {
        if (err) {
          grunt.log.error('Failed to read coverage file.', err);
          res.status(404).send({
            success: false,
            message: 'No coverage report data found.'
          });
        } else {
          var coverageJson = JSON.parse(data);

          if (coverageJson[req.query.file]) {
            res.status(200).send(coverageJson[req.query.file]);
          } else {
            res.status(404).send({
              success: false,
              message: 'No coverage data found for desired file.'
            });
          }
        }
      });
    } else {
      res.status(200).sendFile(f, {}, function (err) {
        if (err) {
          res.status(404).send({
            success: false,
            message: 'No coverage report data found.'
          });
        }
      });
    }
  });

  // store the jscover report to disk
  app.post('/jscoverage.json', function (req, res) {
    // we need data to write to the file
    if (!req.body) {
      grunt.log.error('No Coverage JSON data provided in POST, should never happen.');
      return res.status(500).send('No JSON data provided.');
    }

    fs.writeFile(utils.jscoverageFile(), req.body, function (err) {
      if (err) {
        res.status(500).send({success: false});
      } else {
        grunt.verbose.writeln('Saved coverage data to:', utils.jscoverageFile());
        res.send('success');
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

  app.get('/test/:test', function (req, res) {
    var test = tests[req.params.test];

    // if we do not have this test, 404?
    if (!test) {
      return res.status(404).send('Test not found.');
    }

    var deps = utils.findReferenceTags(test.abs);
    var moduleName;

    // determine if we want to generate coverage reports
    var coverage = typeof req.query.coverage !== 'undefined';

    // attempt to find the module name for this file
    if (options.requirejs) {
      moduleName = path.relative(options.modulesRelativeTo || options.root, test.abs).replace(/\\/g, '/').replace(/\.js$/, '');
    }

    function render(injectHTML) {
      var coverageData = coverage ? utils.getCoverageData() : null;

      res.render('test', {
        modules: moduleName || '',
        injectHTML: injectHTML,
        test: test,
        deps: deps,
        coverage: coverage,
        coverageData: coverageData
      });
    }

    var injectHTML = options.injectHTML || '';

    // if test has an inject HTML file, inject it
    if (test.injectFiles && test.injectFiles.length > 0) {
      test.injectFiles.forEach(function (injectFile) {
        injectHTML += fs.readFileSync(injectFile);
      });
    }

    // if the test has an inject URL, request it and inject it
    if (options.injectServer) {
      var injectUrl = options.injectServer + '?file=' + test.file; // TODO: sanitize the injectUrl

      request(injectUrl, function (err, res, body) {
        if (err) {
          grunt.log.error('Inject server request failed', err);
          if (typeof body !== 'string') body = '';
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