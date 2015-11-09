/*
 * grunt-js-test
 * https://github.com/vistaprint/grunt-js-test
 */

'use strict';

// Nodejs libs.
var _             = require('lodash');

module.exports = function (grunt, options) {
  // Setup phantomjs using grunt-lib-phantomjs
  var phantomjs = require('grunt-lib-phantomjs').init(grunt);

  // Manage runners listening to phantomjs
  var phantomjsEventManager = (function() {
    var listeners = {};
    var suites = [];

    // Hook on Phantomjs Mocha reporter events.
    phantomjs.on('mocha.*', function (test) {
      grunt.verbose.writeln(this.event + ': ' + JSON.stringify(test));
      var name, fullTitle, slow, err;
      var evt = this.event.replace('mocha.', '');

      if (evt == 'suite end' && suites.length <= 1) {
        evt = 'end';
      }

      if (evt === 'end') {
        phantomjs.halt();
        evt = 'end';
      }

      // Expand test values (and façace the Mocha test object)
      if (test) {
        fullTitle = test.fullTitle;
        test.fullTitle = function() {
          return fullTitle;
        };

        slow = this.slow;
        test.slow = function() {
          return slow;
        };

        test.parent = suites[suites.length - 1] || null;

        err = test.err;
      }

      if (evt === 'suite') {
          suites.push(test);
      } else if (evt === 'suite end' || evt === 'end') {
          suites.pop(test);
      }

      // Trigger events for each runner listening
      for (name in listeners) {
        listeners[name].emit.call(listeners[name], evt, test, err);
      }
    });

    return {
      add: function(name, runner) {
        listeners[name] = runner;
      },
      remove: function(name) {
        delete listeners[name];
      },
      getListeners: function () {
        return listeners;
      }
    };
  }());

  // Built-in error handlers.
  phantomjs.on('fail.load', function(url) {
    phantomjs.halt();
    grunt.verbose.write('Running PhantomJS...').or.write('...');
    grunt.log.error();
    grunt.warn('PhantomJS unable to load "' + url + '" URI.', 90);
  });

  phantomjs.on('fail.timeout', function() {
    phantomjs.halt();
    grunt.log.writeln();
    grunt.warn('PhantomJS timed out, possibly due to a missing Mocha run() call.', 90);
  });

  // Debugging messages.
  phantomjs.on('debug', grunt.log.debug.bind(grunt.log, 'phantomjs'));

  // Output console messages if log == true
  if (options.log) {
    phantomjs.removeAllListeners(['console']);
    phantomjs.on('console', grunt.log.writeln);
  } else {
    phantomjs.off('console', grunt.log.writeln);
  }

  // Output errors on script errors
  if (options.logErrors) {
    phantomjs.on('error.*', function(error, stack) {
      var formattedStack = _.map(stack, function(frame) {
        return '    at ' + (frame.function ? frame.function : 'undefined') + ' (' + frame.file + ':' + frame.line + ')';
      }).join('\n');
      grunt.fail.warn(error + '\n' + formattedStack, 3);
    });
  }

  phantomjs.phantomjsEventManager = phantomjsEventManager;

  return phantomjs;
};
