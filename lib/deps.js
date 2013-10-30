'use strict';

var fs = require('fs'),
	path = require('path');


function normalize(file) {
	return path.normalize(file).replace(/\\\\/g, '/').replace(/\\/g, '/').toLowerCase();
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

function sortDeps(data, file) {
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

	include(file);

	return Object.keys(included);
}

module.exports = function (directory, file) {
	directory = normalize(directory);
	file = normalize(path.join(directory, file));

	var data = {};

	function recursive(file) {
		var deps = findDeps(file);
		data[file] = deps;
		deps.forEach(recursive);
	}

	recursive(file);

	return sortDeps(data, file).map(function (file) {
		return file.replace(directory, '');
	});
};