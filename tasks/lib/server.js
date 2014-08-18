#!/usr/bin/env node
'use strict';

// Nodejs libs.
var fs = require('fs');
var http = require('http');
var path = require('path');

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

// Helpers.
var findReferenceTags = require('./deps');


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

  app.use(function (req, res, next) {
    res.locals.tests = tests;
    res.locals.options = options;
    res.locals.utils = utils;
    res.locals.defaultBaseUri = '//' + req.hostname + ':' + options.port;
    res.locals.coverage = typeof req.query.coverage !== 'undefined';
    res.locals.projectBaseUri =  getBaseUri(req.hostname, res.locals.coverage);
    next();
  });

  // create a static file server for project assets
  var statics = express();

  // ensure all responses are utf8 and are accessible cross-domain
  statics.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
  });

  statics.use(options.baseUri, express.static(options.root));
  statics.listen(options.staticPort);

  // coverage report proxy server
  if (options.coverage) {
    // setup request object with a proxy
    var r = request.defaults({'proxy': 'http://127.0.0.1:3128'});

    var proxy = http.createServer(function (req, resp) {
      grunt.verbose.writeln('Coverage Proxy Request:', req.url);
      r.get('http://' + options.hostname + ':' + options.staticPort  + req.url).pipe(resp);
    });

    proxy.listen(options.coverageProxyPort);

    grunt.log.ok('Started proxy web server on port ' + options.coverageProxyPort + '.\n');
  }

  function getBaseUri(host, coverage) {
    return '//' + (host || options.hostname) + ':' + (coverage ? options.coverageProxyPort || options.staticPort : options.staticPort) + '/';
  }

  // list of unit tests
  app.get('/', function (req, res) {
    res.render('index');
  });

  // simple is-alive test
  app.get('/alive', function (req, res) {
    res.send('hello world');
  });

  // jscover page, in case someone makes this request by mistake
  app.get('/jscoverage', function (req, res) {
    res.render('jscoverage');
  });

  // jscoverage json report for a given project
  app.get('/jscoverage.json', function (req, res) {
    res.status(200).sendfile(utils.jscoverageFile(), {}, function (err) {
      if (err) {
        res.status(404).send({
          success: false,
          message: 'No coverage report data found.'
        });
      }
    });
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

    var deps = findReferenceTags(test.abs, options.requirejs).map(utils.resolveReferenceTag);
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

      http.get(injectUrl, function (res) {
        var injectHTML = '';

        res.on('data', function (chunk) {
            injectHTML += chunk;
        });

        res.on('end', function () {
          render(injectHTML);
        });
      }).on('error', function () {
        console.log.warn('Error requesting inject url!');
        render(injectHTML);
      });
    } else {
      // no inject url, so we have all the inject HTML we need, most tests go here, just render the response
      render(injectHTML);
    }
  });

  return app;
};