/**
 * Example Gruntfile for Mocha setup
 */

'use strict';

module.exports = function(grunt) {

	grunt.initConfig({
		mocha: {
			all: [],
			options: {
				reporter: 'Spec',
			}
		}
	});

	grunt.loadTasks('tasks');

	var rootJsLib = 'C:/vp/playpens/development/subversion/Web/www/vp/JS-Lib/';

	grunt.registerTask('findTests', function (target) {
		var config = grunt.config.get('mocha');
		var files = grunt.file.expand([
			rootJsLib + '/**/*.tests.html'
		]);
		console.log(files);
		var urls = grunt.util._.map(files, function (file)
		{
			return 'http://localhost.us/vp/JS-Lib/' + file.replace(rootJsLib, '');
		});
		config.options.urls = urls;
		grunt.config.set('mocha', config);
	});

	grunt.task.registerTask('test', ['findTests', 'mocha']);
};