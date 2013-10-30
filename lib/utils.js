'use strict';

var path = require('path');
var rootJsLib = path.normalize('C:/vp/playpens/development/subversion/Web/www/vp/JS-Lib/');

var isJavaScriptRegEx = new RegExp(/tests\.js$/);
function isJavaScript (file) {
	return isJavaScriptRegEx.test(file);
}

function findTests (root) {
	if (!root) {
		root = rootJsLib;
	}

	var re = /tests\.(html|js)$/;

	// look for all *.tests.html and *.tests.js files
	var files = require('glob').sync('**/*.tests.*', {cwd: rootJsLib})
		// make sure all files are *.tests.html or *.tests.js
		.filter(re.test.bind(re));

	// filter out *.tests.js which have an associated *.tests.html
	files = files.filter(function (file) {
		if (isJavaScript(file)) {
			var htmlFile = file.replace(/\.js$/, '.html');
			if (files.indexOf(htmlFile) > -1) {
				return false;
			}
		}
		return true;
	});

	// add test to the tests
	var tests = files.map(function (file) {
		return {
			url: isJavaScript(file) ? '/test?js=' + file : file,
			file: file,
			filename: path.basename(file),
			dir: path.dirname(file)
		};
	});

	return tests;
}

module.exports = {
	findTests: findTests,

	// return the absolute path for a given test file under the root js-lib
	abs: function (file) {
		return path.resolve(rootJsLib, file);
	},

	// remove the absolute js-lib root path from the given test file
	rel: function (file) {
		return path.relative(rootJsLib, file);
	}
};