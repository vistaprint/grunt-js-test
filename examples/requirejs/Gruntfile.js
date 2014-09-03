'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    'js-test': {
      options: {
        pattern: 'test/*.unittests.js',
        deps: [
          // 'http://requirejs.org/docs/release/2.1.14/minified/require.js',
          'http://requirejs.org/docs/release/2.1.14/comments/require.js',
          'js/require.config.js',
          'test/test-bootstrapper.js'
        ],
        requirejs: true
      }
    }
  });

  // Actually load grunt-js-test
  // grunt.loadNpmTasks('grunt-js-test');
  grunt.loadTasks('../../tasks');

  // By default, run all your tests
  grunt.registerTask('default', ['js-test']);

};
