/*
 * grunt-js-test
 * https://github.com/vistaprint/grunt-js-test
 */

'use strict';

// Nodejs libs.
var _             = require('lodash');
var path          = require('path');

// Helpers.
var findTests  = require('./lib/findTests');
var normalize  = require('./lib/normalize');
var helpers    = require('./lib/mocha-helpers');

module.exports = function (grunt) {
  // express server app, loaded from lib/server.js within startServer
  var startServer = function (options, done) {
    var expressApp = require(path.resolve(__dirname, 'lib', 'server.js'))(grunt, options);

    var args = [
      options.port,
      function () {
        grunt.verbose.writeln('  Web server started on port:' + options.port + (options.hostname ? ', hostname: ' + options.hostname : ', no hostname specified') + ' [pid: ' + process.pid + ']');

        if (done) {
          done(server, expressApp);
        }
      }
    ];

    // always default hostname to 'localhost' would prevent access using IP address
    if (options.hostname && options.hostname !== '*') {
      args.splice(1, 0, options.hostname);
    }

    var server = expressApp.listen.apply(expressApp, args);
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
    reporter: 'Spec',               // mocha reporter to use
    includeChai: true,
    includeSinon: true,

    // headless chrome options
    timeout: 20000,

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

    openBrowser: true               // open web browser automatically when running `js-test-server` task
  };

  var normalizeOptions = function (target) {
    var options = _.extend(
      {},
      defaults,
      grunt.config.get('js-test.options') || {},
      grunt.config.get('js-test.' + target + '.options')
    );

    // process and accept CLI arguments are options

    // --coverage
    var coverage = grunt.option('coverage');
    if (coverage !== undefined) {
      options.coverage = true;
      if (typeof coverage === 'string') {
        options.coverageTool = coverage;
      }
    }

    // --port
    if (grunt.option('port') !== undefined) {
      options.port = grunt.option('port');
    }

    // --staticPort
    if (grunt.option('staticPort') !== undefined) {
      options.staticPort = grunt.option('staticPort');
    }

    // --coverageProxyPort
    if (grunt.option('coverageProxyPort') !== undefined) {
      options.coverageProxyPort = grunt.option('coverageProxyPort');
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

    // --noopenf
    if (grunt.option('noopen')) {
      options.openBrowser = false;
    }

    return options;
  };

  // run all the tests (or a single test, if the --file argument is used)
  grunt.registerTask('js-test', 'Run your client-side unit tests.', function (target) {
    // test to see if the web server is running
    var taskComplete = this.async();

    // standardize the options
    var options = normalizeOptions(target);

    // start web server that serves test pages
    startServer(options, function (server, expressApp) {
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

      // option: send over console messages
      if (options.log) {
        grunt.verbose.writeln('Enabling console.log within phantomjs because `log` is enabled.');
        options.logErrors = true;
      }

      // Setup chrome
      var browserDriver = require('mocha-headless-chrome');

      // Combine any specified URLs with src files. @see http://gruntjs.com/api/inside-tasks#this.filessrc
      // grunt.log.writeln('this.filesSrc', this.filesSrc);

      // Remember all stats from all tests
      var testStats = [];

      // Process each filepath in-order.
      grunt.util.async.forEachSeries(tests, function (test, next) {
        grunt.log.writeln('Testing ' + test.file + '...');
        
        var timeout;
        if (options.phantom) {
          timeout = options.phantom.timeout;
        } else if (options.mocha) {
          timeout = options.mocha.timeout;
        }
        timeout = timeout || options.timeout;

        var cfg = {
          file: test.url,
          reporter: options.reporter,
          timeout: timeout,
          args: 'no-sandbox'
        };

        browserDriver(cfg)
          .then(function(result) {
              var stats = result.result.stats;

              testStats.push(stats);

              // If unit tests failures, show notice
              if (stats.failures > 0) {
                var reduced = helpers.reduceStats([stats]);
                var failMsg = reduced.failures + '/' + reduced.tests + ' tests failed (' + reduced.duration + 's)';

                // Bail tests if bail option is true
                if (options.bail) {
                  grunt.log.error(failMsg);
                  taskComplete(false);
                  return;
                } 
              }

              next();
          })
          .catch(function (err) {
            grunt.log.error(err);

            taskComplete(false);
          });
      },
      // All tests have been run.
      function () {
        var stats = helpers.reduceStats(testStats);

        if (stats.failures === 0) {
          grunt.log.ok(stats.tests + ' passed!' + ' (' + stats.duration + 's)');

          // Async test pass
          require('./lib/save')(grunt, server, expressApp, options, taskComplete);
        } else {
          var failMsg = stats.failures + '/' + stats.tests + ' tests failed (' + stats.duration + 's)';

          // Bail tests if bail option is true
          if (options.bail) {
            grunt.warn(failMsg);
          } else {
            grunt.log.error(failMsg);
          }

          // Async test fail
          taskComplete(false);
        }
      });
    });
  });

  // start the grunt-js-test web server with keepalive
  grunt.registerTask('js-test-server', 'Start server with keepalive.', function (target) {
    var options = normalizeOptions(target);

    // var done = this.async();
    this.async();

    startServer(options, function () {
      grunt.log.writeln('grunt-js-test web server available at http://' + options.hostname + ':' + options.port + '/');

      // attempt to open a web browser
      if (options.openBrowser) {
        var command = null;

        if (process.platform == 'win32') {
          command = 'start ""';
        } else if (process.platform == 'darwin') {
          command = 'open';
        }

        if (command !== null) {
          try {
            var exec = require('child_process').exec;
            exec(command + ' "http://' + options.hostname + ':' + options.port + '"');
          } catch (ex) {
            // empty
          }
        }
      }

      // We do not call done, to keep the server away (keepalive)
      // done();
    });
  });
};
