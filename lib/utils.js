var rootJsLib = 'C:/vp/playpens/development/subversion/Web/www/vp/JS-Lib/';

var isJavaScriptRegEx = new RegExp(/tests\.js$/);
function isJavaScript (file) {
	return isJavaScriptRegEx.test(file);
}

function findTests (root, prefix) {
	if (!root) root = rootJsLib;

	var re = new RegExp(/tests\.(html|js)$/);

	// look for all *.tests.html and *.tests.js files
	var glob = require("glob");

	var files = glob.sync('**/*.tests.*', {cwd: rootJsLib}).map(function (src) {
		return re.test(src) ? src : null;
	});

	var tests = [];

	files.forEach(function (file) {
		if (file === null) return;
		var isJs = isJavaScript(file);
		// filter out *.tests.js when there is a related *.tests.html
		if (isJs) {
			var htmlFile = file.replace(/\.js$/, '.html');
			if (files.indexOf(htmlFile) > -1) {
				return;
			}
		}

		var relativePath = (prefix || '') + '/' + file.replace(rootJsLib, ''),
			path = '/vp/JS-Lib' + relativePath;

		tests.push({
			url: isJs ? '/test?js=' + path : path,
			path: path,
			name: relativePath,
			full: file
		});
	});

	return tests;
}

module.exports = {
	findTests: findTests
};