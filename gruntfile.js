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
				inject: path.join(__dirname, 'lib', 'phantom-bridge.js'),
				reporter: 'Spec',
				timeout: 20000,
				run: false // default will be changing in grunt-mocha >= 0.5
			}
		},

		watch: {
			// grunt-watch to restart the web server
			server: {
				files: ['server.js', 'projects.json', 'lib/*.js'],
				tasks: ['express', 'express-keepalive'],
				options: {
					atBegin: true,
					interrupt: true
				}
			},
		},

		jshint: {
			uses_defaults: [
				'gruntfile.js',
				'server.js',
				'lib/**/*.js',
			],
			options: {
				jshintrc: '.jshintrc',
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-express');
	grunt.loadNpmTasks('grunt-mocha');

	grunt.registerTask('testConnect', 'Test a connection to the js-test-env server.', function () {
		var done = this.async();

		function startServer() {
			grunt.task.run(['express']);
			done();
		}

		var express = grunt.config.get('express');
		var host = express.server.options.hostname || 'localhost';
		var port = express.server.options.port;

		grunt.log.ok('Checking server at http://' + host + ':' + port + '/alive');

		// first make sure the web server is running
		require('http').get({
			host: host,
			port: port,
			path: '/alive',
			timeout: 30
		}, function (res) {
			if (res.statusCode === 200) {
				done();
			} else {
				startServer();
			}
		}).on('error', function () {
			startServer();
		});
	});

	var HELP = [
		'Locate tests that match given filters.',
		'--project     Specify project',
		'--file        Specify test file, rel to project base',
		'--re          Inc. Reg Ex run on test file names',
		'--search      Inc. str match run on test file names',
		'--mocha-grep  Inc. Reg Ex run on test descriptions',
		'--reporter    Mocha reporter to use, default Spec',
		'--bail        Exit on first failed test',
		'--coverage    Generate coverage report data'
	];

	grunt.registerTask('findTests', HELP.join('\n'), function (project) {
		var file = grunt.option('file');
		var config = grunt.config.get('mocha');
		project = project || grunt.option('project'); // project should be the project slug (set in projects.json)

		if (!project && file) {
			grunt.fail.warn('You must provide the project via --project=slug when providing a file to test');
			return;
		}

		var coverage = !!grunt.option('coverage');
		var jenkins = !!grunt.option('jenkins');
		var projects = require('./lib/projects');
		var tests = [];

		// if a project is provided, only find the tests for that project
		if (project) {
			// ensure this project exists
			if (!projects[project]) {
				grunt.fail.warn('No project found by slug:', project);
				return;
			}

			grunt.verbose.write('Finding tests only for project:', project, '\n');
			project = projects[project];
			tests = project.tests(jenkins);
		}
		// if no project is provided, we test all projects
		else {
			projects.forEach(function (project) {
				tests = tests.concat(project.tests(jenkins));
			});
		}

		// filter: find a specific test file
		if (file) {
			grunt.verbose.write('Specific file provided:', file, '\n');
			tests = tests.filter(function (test) {
				return file.toLowerCase() === test.file.toLowerCase();
			});

			if (tests.length === 0) {
				grunt.fail.warn('Failed to find file by --file provided.');
				return;
			}
		}

		// filter: RegExp
		if (grunt.option('re')) {
			grunt.verbose.write('Applying RegEx filter:', grunt.option('re'), '\n');

			var re = new RegExp(grunt.option('re'), 'i');
			tests = tests.filter(function (test) {
				var pass = re.test(test.file);
				grunt.verbose.write('  ', test.file, '=', pass ? 'pass' : 'fail', '\n');
				return pass;
			});
		}

		// filter: simple contains
		if (grunt.option('search')) {
			var search = grunt.option('search');
			grunt.verbose.write('Applying simple filter:', search, '\n');

			tests = tests.filter(function (test) {
				var pass = test.file.toLowerCase().indexOf(search) !== -1;
				grunt.verbose.write('  ', test.file, '=', pass ? 'pass' : 'fail', '\n');
				return pass;
			});
		}

		// set the config for mocha passing the correct URLs to be used
		config.all.options.urls = tests.map(function (test) {
			return 'http://localhost:8981' + test.url + (coverage ? '&coverage=1' : '');
		});

		// option: bail - exit on first error found
		if (grunt.option('bail') || jenkins) {
			config.all.options.bail = true;
		}

		// option: mocha-grep - grep within the test file, mocha does this
		if (grunt.option('mocha-grep')) {
			config.all.options.mocha = {
				grep: grunt.options('mocha-grep')
			};
		}

		// option: send over console messages
		if (grunt.option('log')) {
			// log console.log messages
			config.all.options.log = true;

			// log javascript errors
			config.all.options.logErrors = true;
		}

		// option: allow the mocha reporter to change
		if (grunt.option('reporter')) {
			config.options.reporter = grunt.option('reporter');
		}

		grunt.config.set('mocha', config);
	});

	// run all the tests (or a single test, if the --file argument is used)
	grunt.registerTask('test', 'Run tests for a project.', function (project) {
		if (project) {
			grunt.task.run(['testConnect', 'findTests:' + project, 'mocha']);
		} else {
			grunt.task.run(['testConnect', 'findTests', 'mocha']);
		}
	});

	// start the express server with keepalive
	grunt.registerTask('server', 'Start server with keepalive.', ['express', 'express-keepalive']);
	grunt.registerTask('server-live', 'Start web server under grunt:watch utility to live reload upon changes.', ['watch:server']);

	// start the jscover proxy server
	grunt.registerTask('jscover', 'Start JSCover proxy server.', function () {
		var done = this.async(),
			cmd = 'java -jar jscover/JSCover-all.jar -ws --proxy --port=3128', // --local-storage',
			exec = require('child_process').exec;

		grunt.log.ok('JSCover proxy server started.');

		exec(cmd, function (err, stdout, stderr) {
			if (err) {
				console.log(err, stdout, stderr);
			}

			grunt.log.ok('JSCover proxy server terminated.');
			done();
		});

		done();
	});

	// Run coverage reports
	grunt.registerTask('coverage', 'Start the JSCover proxy server and the web server', ['jscover', 'server']);
};