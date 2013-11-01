'use strict';

var fs = require('fs'),
	path = require('path'),
	utils = require('./utils');

function normalize(file) {
	return path.normalize(file).toLowerCase();
}

function findDeps(filePath) {
	var re = /\/\/\/\s*<reference.+path=\"(.+)\"\s*\/>/gi;
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

function sortDeps(data, files) {
	var included = {};

	function include (name) {
		// confirm this file has not been included
		if (included[name]) {
			return '';
		}

		if (typeof data[name] === 'undefined') {
			console.log('Script ' + name + ' not found!');
			return false;
		}

		// include all deps before including this
		data[name].forEach(include);

		// mark this file as being included so we do not re-include
		included[name] = true;
	}

	files.forEach(include);

	return Object.keys(included);
}

module.exports = function (files) {
	// ensure files is an array
	if (!Array.isArray(files)) {
		files = [files];
	}

	// convert all paths to absolute paths
	files = files.map(utils.abs);

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
	var deps = sortDeps(data, files);

	// convert all absolute paths back to relative paths
	return deps.map(utils.rel);
};