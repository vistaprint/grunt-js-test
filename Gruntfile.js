'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    eslint: {
      options: {
        format: 'compact'
      },
      'default': {
        src: [
          'tasks/**/*.js',
          'tests/**/*.js',
          'Gruntfile.js'
        ]
      }
    },
    'js-test': {
      options: {
          pattern: 'tests/*.browser.working.unittests.js',
          reporter: 'spec'      
        },
      'broken': {
        options: {
          pattern: 'tests/*.browser.broken.unittests.js'
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-eslint');

  grunt.loadTasks('./tasks');

  // Whenever the "test" task is run, run the "nodeunit" task.
  // grunt.registerTask('test', ['eslint', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['eslint', 'js-test']);

};
