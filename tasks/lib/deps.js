'use strict';

var fs = require('fs'),
	path = require('path');

function normalize(file) {
	return path.normalize(file).toLowerCase();
}

function findDeps(filePath) {
	var re = /\/\/\/\s*<reference.+path=\"(.+)\".*\/>/gi;
	var contents = fs.readFileSync(filePath, {encoding: 'utf8'});
	var deps = [];
	var match;

	while ((match = re.exec(contents))) {
		deps.push(
			normalize(path.join(path.dirname(filePath), match[1]))
		);
	}

	return deps;
}

function sortDeps(data, files, excludeSpecifiedFiles) {
	var included = {};

	function include(name) {
		// confirm this file has not been included
		if (included[name]) {
			return;
		}

		if (typeof data[name] === 'undefined') {
			console.log('Script ' + name + ' not found!');
			return;
		}

		// include all deps before including this
		data[name].forEach(include);

		// mark this file as being included so we do not re-include
		included[name] = true;
	}

	files.forEach(include);

	// optionally remove the files and only return the deps for the file
	if (excludeSpecifiedFiles) {
		files.forEach(function (file) {
			delete included[file];
		});
	}

	return Object.keys(included);
}

module.exports = function (files, excludeSpecifiedFiles) {
	// ensure files is an array
	if (!Array.isArray(files)) {
		files = [files];
	}

	// standardize all paths to be non-case sensitive
	files = files.map(normalize);

	// a {file: dependencies} dictionary object
	var data = {};

	function recursive(file) {
		var deps = findDeps(file);
		data[file] = deps;
		deps.forEach(recursive);
	}

	// go through each file we need and find their dependencies, recursively
	files.forEach(recursive);

	// sort the dependencies, ensuring every required file is included
	return sortDeps(data, files, excludeSpecifiedFiles);
};