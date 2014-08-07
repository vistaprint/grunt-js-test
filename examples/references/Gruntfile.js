'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    'js-test': {
      options: {
        referenceTags: true,
        coverage: false,
        pattern: 'test/*.js',
        deps: [
          'http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.js'
        ]
      }
    }
  });

  // Actually load grunt-js-test
  // grunt.loadNpmTasks('grunt-js-test');
  grunt.loadTasks('../../tasks');

  // By default, run all your tests
  grunt.registerTask('default', ['js-test']);

};
