'use strict';

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

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
		}
	});

	grunt.loadNpmTasks('grunt-mocha');

	grunt.registerTask('testConnect', 'Test a connection to the js-test-env server.', function () {
		var done = this.async();

		function fail(msg) {
			console.error(msg);
			process.exit(1);
		}

		// first make sure the web server is running
		require('http').get({
			host: 'localhost',
			port: 8981,
			path: '/alive',
			timeout: 30
		}, function (res) {
			if (res.statusCode == 200) {
				done();
			} else {
				fail('JavaScript Test Environment: unknown error with web server');
			}
		}).on('error', function(e) {
			fail('JavaScript Test Environment: web server is not running, use `npm start`.');
		});
	});

	grunt.registerTask('findTests', 'Locate all tests and generate an array of test URLs.', function () {
		var findTests = require('./lib/utils').findTests;
		var config = grunt.config.get('mocha');

		config.all.options.urls = findTests().map(function (test) {
			return 'http://localhost:8981' + test.url;
		});

		grunt.config.set('mocha', config);
	});

	grunt.registerTask('test', ['testConnect', 'findTests', 'mocha']);
	grunt.registerTask('test-bypass', ['findTests', 'mocha']);
};