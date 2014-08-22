'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    eslint: {
      options: {
        config: 'eslint.json',
        format: 'compact'
      },
      'default': {
        src: [
          'tasks/**/*.js',
          'tests/**/*.js',
          'Gruntfile.js',
        ]
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-eslint');

  // Whenever the "test" task is run, run the "nodeunit" task.
  // grunt.registerTask('test', ['eslint', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['eslint']);

};
