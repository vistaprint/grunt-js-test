'use strict';

var fs = require('fs');
var path = require('path');

var isJavaScriptRegEx = new RegExp(/tests\.js$/);
var DEFAULT_PATTERN = '*.tests.*';

function isJavaScript(file) {
	return isJavaScriptRegEx.test(file);
}

// convert an array of strings into an array of regular expressions
function getRegExs(list) {
	// if the list is already an array, just map the strings
	// to regular expressions
	if (Array.isArray(list)) {
		return list.map(function (regex) {
			return new RegExp(regex);
		});
	}
	// if the "list" is a string, assume it's a single regular expression
	else if (typeof list === 'string') {
		return [new RegExp(list)];
	}
	// if there is anything else being passed, throw an error
	else if (list !== undefined) {
		throw new Error('Invalid configuration for projects.json (include or exclude is invalid).');
	}
	// otherwise, there is nothing to convert
	else {
		return null;
	}
}

function Project(project) {
	this.name = project.name;
	this.slug = project.slug || encodeURIComponent(this.name);
	this._locations = project.locations;
	this.deps = project.deps || null;

	this.locations = this._locations.map(function (location) {
		location.root = path.normalize(location.root);
		location.include = getRegExs(location.include); // convert the include array into regular expressions
		location.exclude = getRegExs(location.exclude); // convert the exclude array into regular expressions
		return location;
	}, this);

	this._tests = null;
}

Project.prototype.findTests = function (location, locationNum) {
	var re = /tests\.(html|js)$/;

	// look for all *.tests.html and *.tests.js files
	var files = require('glob').sync(location.pattern || DEFAULT_PATTERN, {cwd: location.root})
		// make sure all files are *.tests.html or *.tests.js
		.filter(re.test.bind(re));

	// filter out paths by the inclusive "include" option
	if (location.include) {
		files = files.filter(function (file) {
			return location.include.every(function (include) {
				return include.test(file);
			});
		});
	}

	// filter out paths by the "exclude" option
	if (location.exclude) {
		files = files.filter(function (file) {
			return location.exclude.every(function (exclude) {
				return !exclude.test(file);
			});
		});
	}

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
	return files.map(function (file, fileNum) {
		var url;

		if (isJavaScript(file)) {
			url = '/test/' + this.slug + '/' + locationNum + '/' + fileNum + '?js=' + file;
		} else {
			url = path.join(location.uri, file).replace(/\\/g, '/');
		}

		return {
			url: url,
			file: file,
			filename: path.basename(file),
			dir: path.dirname(file),
			root: location.root,
			abs: path.join(location.root, file)
		};
	}, this);
};

Project.prototype.getTest = function (locationNum, fileNum) {
	this.tests();
	return this.locations[locationNum].tests[fileNum];
};

Project.prototype.tests = function () {
	if (this._tests === null) {
		var tests = [];

		this.locations.forEach(function (location, i) {
			if (location.pattern !== false) {
				var ts = this.findTests(location, i);
				tests = tests.concat(ts);
				location.tests = tests;
			}
		}, this);

		this._tests = tests;
	}

	return this._tests;
};

function main() {
	var data = fs.readFileSync(__dirname + '/../projects.json', 'utf8');

	if (!data) {
		console.error('failed to read projects.json');
		process.exit(1);
	}

	var projects = [];
	var projectData = JSON.parse(data);

	// convert the generic json data to an array of Project objects
	projectData.forEach(function (project) {
		// ensure the project is not disabled within the projects.json config
		if (!project.disabled) {
			project = new Project(project);
			projects.push(project);
			projects[project.slug] = project;
		}
	});

	return projects;
}

module.exports = main();