'use strict';

var path = require('path');

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    'js-test': {
      options: {
        root: path.join(__dirname, '../references'),
        pattern: 'test/*.js',
        referenceTags: true,
        coverage: true,
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
