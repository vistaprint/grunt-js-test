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
var normalize  = require('./lib/normalize');

module.exports = function (grunt) {
  grunt.loadTasks(path.join(__dirname, '../node_modules/grunt-mocha/tasks'));

  // express server app, loaded from lib/server.js within startServer
  var server, expressApp;

  var startServer = function (options, done) {
    expressApp = require(path.resolve(__dirname, 'lib', 'server.js'))(grunt, options);

    var args = [
      options.port,
      function () {
        grunt.verbose.writeln('  Web server started on port:' + options.port + (options.hostname ? ', hostname: ' + options.hostname : ', no hostname specified') + ' [pid: ' + process.pid + ']');

        if (done) {
          done();
        }
      }
    ];

    // always default hostname to 'localhost' would prevent access using IP address
    if (options.hostname && options.hostname !== '*') {
      args.splice(1, 0, options.hostname);
    }

    server = expressApp.listen.apply(expressApp, args);
    server.timeout = options.serverTimeout;
  };

  var defaults = {
    // project options
    root: process.cwd(),            // root path to your website javascript files
    pattern: '**/*.unittests.js',   // search pattern to locate your unit tests (this can be an array of glob expressions)
    include: [],                    // utility to whitelist test files
    exclude: ['/node_modules/'],    // utility to blacklist test files, by default we ignore anythign under a /node_modules/ directory
    baseUri: '/',                   // the path to use for web assets, usually / will work
    deps: [],                       // global dependencies for each test that you don't want to <reference>
    stylesheets: [],                // array of global stylesheets to load with each test file
    referenceTags: true,            // indicate whether the js-test-env should look for <reference> tags
    injectQueryString: null,        // optional URL query strings to inject into every test URL when using js-test task
    injectHTML: null,               // optional HTML content to inject into every test page

    // web server options
    hostname: 'localhost',          // hostname for grunt-express server
    port: 8981,                     // port for grunt-express server
    staticPort: 8982,               // port used for secondary web server that serves your static project files
    serverTimeout: 1000,            // timeout for http connections to servers

    // unit testing service options
    mocha: {},                      // grunt-mocha overrides
    reporter: 'Spec',               // mocha reporter to use

    // coverage reporting options
    coverage: false,                // should we generate coverage reports (slows down tests)
    coverageTool: 'istanbul',       // which reporter should we use, jscover or istanbul
    coverageReportDirectory: path.join(process.cwd(), 'coverage'),  // directory to save reports to
    coverageProxyPort: 8983,        // port used as a proxy web server to instrument javascript files for coverage
    identifier: null,               // unique job identifier used when creating the folder for a new coverage report

    // further filters to narrow tests that are run
    file: null,                     // run only this file, by file name
    re: null,                       // run tests with file names that match this regular expression
    search: null,                   // run tests with file names that contain the string passed (case insensitive)
    bail: false,                    // if true we'll stop running tests once we find a single failure
    grep: false,                    // passed to mocha, runs a regex test on the test descriptions
    log: false,                     // if true, will pass console.log data from phantomjs to node console for debugging

    requirejs: false,               // if your project is requirejs based, set this to true
    modulesRelativeTo: null,        // allows you to override how we determine the module name with its path

    openBrowser: true,              // open web browser automatically when running `js-test-server` task
  };

  var acceptCLI = function (options) {
    // --coverage
    var coverage = grunt.option('coverage');
    if (coverage !== undefined) {
      options.coverage = true;
      if (typeof coverage === 'string') {
        options.coverageTool = coverage;
      }
    }

    // --identifier
    if (grunt.option('identifier') !== undefined) {
      options.identifier = grunt.option('identifier');
    }

    // --file
    if (grunt.option('file') !== undefined) {
      options.file = grunt.option('file');
    }

    // --search
    if (grunt.option('search') !== undefined) {
      options.search = grunt.option('search');
    }

    // --bail
    if (grunt.option('bail') !== undefined) {
      options.bail = true;
    }

    // --reporter
    if (grunt.option('reporter') !== undefined) {
      options.reporter = grunt.option('reporter');
    }

    // --log || --debug turns on test debugging
    if (grunt.option('log')) {
      options.log = true;
    }

    // --noopen
    if (grunt.option('noopen')) {
      options.openBrowser = false;
    }
  };

  // run all the tests (or a single test, if the --file argument is used)
  grunt.registerTask('js-test', 'Run your client-side unit tests.', function (target) {
    // test to see if the web server is running
    var taskComplete = this.async();

    // standardize the options
    var options = _.extend(
      {},
      defaults,
      grunt.config.get('js-test.options') || {},
      grunt.config.get('js-test.' + target + '.options')
    );

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

      var tests = findTests(grunt, options);

      // list all tests found when --verbose is provided
      grunt.verbose.writeln('  Test files found:');
      tests.forEach(function (test) {
        grunt.verbose.writeln('    ' + test.file);
      });

      // filter: find a specific test file
      if (options.file) {
        var file = normalize(options.file);
        grunt.verbose.writeln('  --file filter:', file);

        tests = tests.filter(function (test) {
          var match = normalize(test.file);
          var pass = file == match;
          grunt.verbose.writeln('    ', match, '=', pass ? 'true' : 'false');
          return pass;
        });

        if (tests.length === 0) {
          grunt.fail.warn('No test files matching:' + file + ' (try --verbose)');
        }
      }

      // filter tests: simple string matching
      if (options.search) {
        var search = options.search.toLowerCase();
        var regex = false;
        grunt.verbose.writeln('  --search filter:', search);

        if (search.indexOf('*') > -1) {
          search = new RegExp(options.search.replace('*', '.*'));
          regex = true;
        }

        tests = tests.filter(function (test) {
          var match = test.file.toLowerCase();
          var pass = regex ? search.test(match) : match.indexOf(search) > -1;
          grunt.verbose.writeln('    ', match, '=', pass ? 'true' : 'false');
          return pass;
        });
      }

      // set the config for mocha passing the correct URLs to be used
      mochaConfig.urls = tests.map(function (test) {
        var url = 'http://' + options.hostname + ':' + options.port + test.url;

        // if we're generating coverage data, let the server know specifically we want to do it right now
        if (options.coverage) {
          url += '&coverage=1';
        }

        // if there are extra query string arguments to add, add them
        if (options.injectQueryString) {
          url += '&' + options.injectQueryString;
        }

        url += '&phantom=1';

        return url;
      });

      // option: bail - exit on first error found
      if (options.bail) {
        mochaConfig.bail = true;
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

      grunt.task.run(['mocha:grunt-js-test', 'js-test-save']);

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

    // js-test runs three web servers, we need to close them all
    var serverClosed = false;
    var staticServerClosed = false;
    var coverageServerClosed = options.coverage ? false : true;

    // once a single server has closed, check to see if the others are closed as well, if so, complete task
    var checkAll = function () {
      if (serverClosed && staticServerClosed && coverageServerClosed) {
        // task can now be considered done
        done();
      }
    };

    server.close(function () {
      serverClosed = true;
      checkAll();
    });

    expressApp.staticServer.close(function () {
      staticServerClosed = true;
      checkAll();
    });

    // now save the coverage report data if we should
    if (options.coverage) {
      grunt.log.writeln('Generating coverage report.');

      expressApp.saveCoverageReport(function (err) {
        if (err) {
          grunt.log.error('Failed to generate coverage report.');
        }

        var done = function () {
          coverageServerClosed = true;
          checkAll();
        };

        if (expressApp.coverageServer.close) {
          expressApp.coverageServer.close(done);
        } else {
          done();
        }
      });
    }
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

    var done = this.async();

    startServer(options, function () {
      grunt.log.writeln('grunt-js-test web server available at http://' + options.hostname + ':' + options.port + '/');

      // attempt to open a web browser
      if (options.openBrowser && process.platform == 'win32') {
        try {
          var exec = require('child_process').exec;
          exec('start "" "http://' + options.hostname + ':' + options.port + '"');
        } catch (ex) {}
      }

      grunt.task.run('js-test-server-keepalive');
      done();
    });
  });

  grunt.registerTask('js-test-server-keepalive', 'Keep server running', function () {
    this.async();
  });
};
