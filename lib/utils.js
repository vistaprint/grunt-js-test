'use strict';

var path = require('path');
var rootJsLib = 'C:/vp/playpens/development/subversion/Web/www/vp/JS-Lib/';

var isJavaScriptRegEx = new RegExp(/tests\.js$/);
function isJavaScript (file) {
	return isJavaScriptRegEx.test(file);
}

function findTests (root, prefix) {
	if (!root) {
		root = rootJsLib;
		prefix = '/vp/JS-Lib';
	}

	var re = new RegExp(/tests\.(html|js)$/);

	// look for all *.tests.html and *.tests.js files
	var glob = require('glob');

	var files = glob.sync('**/*.tests.*', {cwd: rootJsLib}).map(function (src) {
		return re.test(src) ? src : null;
	});

	var tests = [];

	files.forEach(function (file) {
		if (!file) {
			return;
		}

		var isJs = isJavaScript(file);
		// filter out *.tests.js when there is a related *.tests.html
		if (isJs) {
			var htmlFile = file.replace(/\.js$/, '.html');
			if (files.indexOf(htmlFile) > -1) {
				return;
			}
		}

		var relativePath = (prefix || '') + '/' + file.replace(rootJsLib, '');

		tests.push({
			url: isJs ? '/test?js=' + relativePath : relativePath,
			file: file,
			basename: path.basename(file),
			directory: '/' + path.dirname(file)
		});
	});

	return tests;
}

module.exports = {
	findTests: findTests
};