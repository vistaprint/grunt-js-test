'use strict';

var path = require('path');

module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		express: {
			server: {
				options: {
					port: 8981,
					server: path.resolve(__dirname, 'server.js')
				}
			}
		},

		mocha: {
			all: {
				options: {
					urls: ['test/*.unittests.html']
				}
			},
			options: {
				reporter: 'Spec',
				timeout: 20000
			}
		},

		jshint: {
			uses_defaults: [
				'gruntfile.js',
				'server.js',
				'lib/**/*.js'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-express');
	grunt.loadNpmTasks('grunt-mocha');

	grunt.registerTask('findTests', 'Locate all tests and generate an array of test URLs.', function () {
		var file = grunt.option('file');
		var config = grunt.config.get('mocha');

		if (file) {
			// TODO: check if this file is an *.tests.html
			config.all.options.urls = [
				'http://localhost:8981/test?js=' + file.replace(/^\//, '')
			];
		} else {
			var findTests = require('./lib/utils').findTests;

			config.all.options.urls = findTests().map(function (test) {
				return 'http://localhost:8981' + test.url;
			});
		}

		grunt.config.set('mocha', config);
	});

	// run all the tests (or a single test, if the --file argument is used)
	grunt.registerTask('test', ['express', 'findTests', 'mocha']);

	// an option to bypass the textConnect step
	grunt.registerTask('test-bypass', ['findTests', 'mocha']);

	// start the express server with keepalive
	grunt.registerTask('server', ['express', 'express-keepalive']);
};