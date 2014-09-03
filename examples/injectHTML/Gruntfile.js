'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    'js-test': {
      options: {
        pattern: 'test/*.js'
      }
    }
  });

  // Actually load grunt-js-test
  // grunt.loadNpmTasks('grunt-js-test');
  grunt.loadTasks('../../tasks');

  // By default, run all your tests
  grunt.registerTask('default', ['js-test']);

};
