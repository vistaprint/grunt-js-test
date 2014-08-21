/*
 * grunt-js-test
 * https://github.com/benhutchins/grunt-js-test
 */

'use strict';

// Nodejs libs.
var _             = require('lodash');
var path          = require('path');

// Helpers.
var findTests  = require('./lib/findTests');

module.exports = function (grunt) {

  grunt.loadTasks(path.join(__dirname, '../node_modules/grunt-express/tasks'));
  grunt.loadTasks(path.join(__dirname, '../node_modules/grunt-mocha/tasks'));

  var server;

  function startServer(options, done) {
    server = require(path.resolve(__dirname, 'lib', 'server.js'))(grunt, options);

    var express = _.extend({}, {
      options: {
        hostname: options.hostname,
        port: options.port,
        server: server
      }
    }, options.express || {});

    grunt.config.set('express.grunt-js-test', express);
    grunt.task.run('express:grunt-js-test');

    if (done) {
      done();
    }
  }

  var defaults = {
    // project options
    root: process.cwd(),            // root path to your website javascript files
    pattern: '**/*.unittests.js',   // search pattern to locate your unit tests
    include: [],
    exclude: ['/node_modules/'],
    baseUri: '/',                   // the path to use for web assets, usually / will work
    deps: [],                       // global dependencies for each test that you don't want to <reference>
    referenceTags: true,            // indicate whether the js-test-env should look for <reference> tags

    // web server options
    express: {},                    // grunt-express overrides
    hostname: 'localhost',          // hostname for grunt-express server
    port: 8981,                     // port for grunt-express server
    staticPort: 8982,               // port used for secondary web server that serves your static project files

    // unit testing service options
    mocha: {},                      // grunt-mocha overrides
    reporter: 'Spec',               // mocha reporter to use

    // coverage reporting options
    coverage: false,                // should we generate coverage reports (slows down tests)
    coverageTool: 'instanbul',      // which reporter should we use, jscover or instanbul
    coverageReportDirectory: path.join(process.cwd(), 'coverage'),  // directory to save reports to
    coverageProxyPort: 8983,        // port used as a proxy web server to instrument javascript files for coverage

    // further filters to narrow tests that are run
    file: null,                     // run only this file, by file name
    re: null,                       // run tests with file names that match this regular expression
    search: null,                   // run tests with file names that contain the string passed (case insensitive)
    bail: false,                    // if true we'll stop running tests once we find a single failure
    grep: false,                    // passed to mocha, runs a regex test on the test descriptions
    log: false,                     // if true, will pass console.log data from phantomjs to node console for debugging

    requirejs: false,               // if your project is requirejs based, set this to true
    modulesRelativeTo: null,        // allows you to override how we determine the module name with its path
  };

  function acceptCLI(options) {
    // --coverage
    var coverage = grunt.option('coverage');
    if (coverage !== undefined) {
      options.coverage = true;
      if (typeof coverage === 'string') {
        options.coverageTool = coverage;
      }
    }

    // --log || --debug turns on test debugging
    if (grunt.option('log') || grunt.option('debug')) {
      options.log = true;
    }
  }

  // run all the tests (or a single test, if the --file argument is used)
  grunt.registerTask('js-test', 'Run your client-side unit tests.', function () {
    // test to see if the web server is running
    var taskComplete = this.async();

    // standardize the options
    var options = this.options(defaults);

    // accept CLI options to change options
    acceptCLI(options);

    startServer(options, function () {
      var mochaConfig = _.extend({}, {
        urls: ['test/*.unittests.html'], // this is a dummy, it's overridden below
        inject: null, // we disable grunt-mocha's phantom-bridge, we implement our own in /view/deps/shared.js
        reporter: options.reporter,
        timeout: 20000,
        run: false // default will be changing in grunt-mocha >= 0.5
      }, options.mocha || {});

      var tests = findTests(options);

      // standardize some toggles that can be passed via cli

      // filter: find a specific test file
      if (options.file) {
        var file = options.file.toLowerCase();
        grunt.verbose.write('Specific file provided:', file, '\n');
        tests = tests.filter(function (test) {
          return file === test.file.toLowerCase();
        });

        if (tests.length === 0) {
          grunt.fail.warn('Failed to find file specified:', file);
          return;
        }
      }

      // filter tests: RegExp matching
      if (options.re) {
        var re = new RegExp(options.re, options.rep || 'i');
        grunt.verbose.write('Applying RegEx filter:', options.re, '\n');

        tests = tests.filter(function (test) {
          var pass = re.test(test.file);
          grunt.verbose.write('  ', test.file, '=', pass ? 'pass' : 'fail', '\n');
          return pass;
        });
      }

      // filter tests: simple string contains matching
      if (options.search) {
        var search = options.search.toLowerCase();
        grunt.verbose.write('Applying simple filter:', search, '\n');

        tests = tests.filter(function (test) {
          var pass = test.file.toLowerCase().indexOf(search) !== -1;
          grunt.verbose.write('  ', test.file, '=', pass ? 'pass' : 'fail', '\n');
          return pass;
        });
      }

      // set the config for mocha passing the correct URLs to be used
      mochaConfig.urls = tests.map(function (test) {
        return 'http://' + options.hostname + ':' + options.port + test.url + (options.coverage ? '&coverage=1' : '');
      });

      // option: bail - exit on first error found
      if (options.bail) {
        mochaConfig.bail = true;
      }

      // option: grep - grep within the test file, mocha does this (mocha-grep)
      if (options.grep) {
        mochaConfig.mocha = {
          grep: options.grep
        };
      }

      // option: send over console messages
      if (options.log) {
        grunt.verbose.writeln('Enabling console.log within phantomjs.');

        // log console.log messages
        mochaConfig.log = true;

        // log javascript errors
        mochaConfig.logErrors = true;
      }

      grunt.config.set('mocha.grunt-js-test', {
        options: mochaConfig
      });

      if (options.coverage) {
        grunt.task.run(['mocha:grunt-js-test', 'js-test-save']);
      } else {
        grunt.task.run('mocha:grunt-js-test');
      }

      taskComplete();
    });
  });

  grunt.registerTask('js-test-save', 'Runs after completing tests from `js-test` to generate a coverage report.', function (target) {
    var options = _.extend(
      {},
      defaults,
      grunt.config.get('js-test.options') || {},
      grunt.config.get('js-test.' + target + '.options')
    );

    acceptCLI(options);

    var done = this.async();

    grunt.log.writeln('Generating coverage report.');

    server.saveCoverageReport(function (err) {
      if (err) {
        grunt.log.error('Failed to generate coverage report.');
      }

      done();
    });
  });

  // start the grunt-js-test web server with keepalive
  grunt.registerTask('js-test-server', 'Start server with keepalive.', function (target) {
    var options = _.extend(
      {},
      defaults,
      grunt.config.get('js-test.options') || {},
      grunt.config.get('js-test.' + target + '.options')
    );

    acceptCLI(options);

    startServer(options, function () {
      // attempt to open a web browser
      if (process.platform == 'win32') {
        try {
          var exec = require('child_process').exec;
          exec('start "" "http://' + options.hostname + ':' + options.port + '"');
        } catch (ex) {}
      }

      grunt.task.run('express-keepalive');
    });
  });
};
