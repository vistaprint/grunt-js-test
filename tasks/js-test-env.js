/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 *
 * Mocha task
 * Copyright (c) 2012 Kelly Miyashiro
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

'use strict';

// Nodejs libs.
var _             = require('lodash');
var path          = require('path');
// var reporters     = require('mocha').reporters;
var http          = require('http');
var exec          = require('child_process').exec;

// Helpers.
var findTests  = require('./lib/findTests');

module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-express');
  grunt.loadNpmTasks('grunt-mocha');

  function startCoverageServer() {
    // start the jscover proxy server
    var cmd = 'java -jar jscover/JSCover-all.jar -ws --proxy --port=3128';
    var exec = require('child_process').exec;

    grunt.log.ok('JSCover proxy server started.');

    exec(cmd, function (err, stdout, stderr) {
      if (err) {
        console.log(err, stdout, stderr);
      }

      grunt.log.ok('JSCover proxy server terminated.');
    });
  }

  function ensureServerIsRunning(options, done) {
    function startServer() {
      if (options.coverage) {
        startCoverageServer();
      }

      var express = Object.merge({
        options: {
          hostname: options.hostname,
          port: options.port,
          server: require(path.resolve(__dirname, 'lib', 'server.js'))(grunt, options)
        }
      }, options.express || {});

      grunt.config.set('express.js-test-env', express);

      grunt.task.run('express:js-test-env');

      if (done) {
        done();
      }
    }

    var host = options.hostname;
    var port = options.port;

    grunt.log.ok('Checking server at http://' + host + ':' + port + '/alive');

    // first make sure the web server is running
    // http.get({
    //   host: host,
    //   port: port,
    //   path: '/alive',
    //   timeout: 30
    // }, function (res) {
    //   console.log('HERE???');
    //   if (res.statusCode === 200) {
    //     if (done) {
    //       done();
    //     }
    //   } else {
    //     startServer();
    //   }
    // }).on('error', function () {
    //   console.log('ERRORS?', arguments);
    //   startServer();
    // });

    startServer();
  }

  var defaults = {
    root: process.cwd(),            // root path to your website javascript files
    pattern: '**/*.unittests.js',   // search pattern to locate your unit tests
    baseUri: '/',                   // the path to use for web assets, usually / will work
    deps: [],                       // global dependencies for each test that you don't want to <reference>
    referenceTags: true,            // indicate whether the js-test-env should look for <reference> tags

    express: {},                    // grunt-express overrides
    hostname: 'localhost',          // hostname for grunt-express server
    port: 8981,                     // port for grunt-express server
    staticPort: 8982,               // port used for secondary web server that serves your static project files
    coverageProxyPort: 8983,        // port used as a proxy web server to instrument javascript files for coverage

    mocha: {},                      // grunt-mocha overrides
    reporter: 'Spec',               // mocha reporter to used, by default Spec is used
    coverage: false,                // should we generate coverage reports (slows down tests)

    // further filters to narrow tests that are run
    file: null,                     // run only this file, by file name
    re: null,                       // run tests with file names that match this regular expression
    search: null,                   // run tests with file names that contain the string passed (case insensitive)
    bail: false,                    // if true we'll stop running tests once we find a single failure
    grep: false,                    // passed to mocha, runs a regex test on the test descriptions
    log: false,                     // if true, will pass console.log data from phantomjs to node console for debugging
  };

  // run all the tests (or a single test, if the --file argument is used)
  grunt.registerTask('js-test', 'Run your client-side unit tests.', function () {
    // test to see if the web server is running
    var taskComplete = this.async();

    // standardize the options
    var options = this.options(defaults);

    ensureServerIsRunning(options, function () {
      var mochaConfig = Object.merge({
        urls: ['test/*.unittests.html'],

        inject: path.join(__dirname, 'lib', 'phantom-bridge.js'),
        reporter: options.reporter,
        timeout: 20000,
        run: false // default will be changing in grunt-mocha >= 0.5
      }, options.mocha || {});

      var tests = findTests(options);

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
        return 'http://localhost:8981' + test.url + (options.coverage ? '&coverage=1' : '');
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
        // log console.log messages
        mochaConfig.log = true;

        // log javascript errors
        mochaConfig.logErrors = true;
      }

      grunt.config.set('mocha', {
        'js-test-env': {
          options: mochaConfig
        }
      });

      grunt.task.run('mocha:js-test-env');
      taskComplete();
    });
  });

  // start the js-test-env web server with keepalive
  grunt.registerTask('js-test-server', 'Start server with keepalive.', function (target) {
    var options = Object.merge(
      defaults,
      grunt.config.get('js-test.options') || {},
      grunt.config.get('js-test.' + target + '.options')
    );

    ensureServerIsRunning(options, function () {
      grunt.task.run('express-keepalive');
    });
  });
};
