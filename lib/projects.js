'use strict';

var fs = require('fs');
var path = require('path');

var DEFAULT_PATTERN = '*.tests.js';

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
		console.error('Error: Invalid configuration for projects.json (include or exclude is invalid).');
		process.exit(1);
	}
	// otherwise, there is nothing to convert
	else {
		return null;
	}
}

function Project(project) {
	// merge all the config from the projects.json into the project object
	for (var key in project) {
		if (project.hasOwnProperty(key)) {
			this[key] = project[key];
		}
	}

	// override some things
	this.name    = project.name;
	this.slug    = project.slug || encodeURIComponent(this.name);
	this.deps    = project.deps || null;
	this.baseUri = project.baseUri;
	this.root    = path.normalize(project.root);
	this.include = getRegExs(project.include);
	this.exclude = getRegExs(project.exclude);
	this._tests  = null;

	this.statics = [
		{
			baseUri: this.baseUri,
			root: this.root
		}
	];

	this.resolveDeps = this.resolveDeps.bind(this);
}

Project.prototype.getBaseUri = function (host) {
	if (!this.port) {
		throw new Error('No port for this project, unable to process');
	}

	return 'http://' + host + ':' + this.port + '/';
};

Project.prototype.findTests = function (jenkins) {
	var re = /tests\.js$/;
	var root = this.root;

	// when using jenkins, use a different root folder
	if (jenkins && this.jenkins) {
		root = this.jenkins;
	}

	// look for all *.tests.html and *.tests.js files
	var files = require('glob').sync(this.pattern || DEFAULT_PATTERN, {cwd: root})
		// make sure all files are *tests.html or *tests.js
		.filter(re.test.bind(re));

	// filter out paths by the inclusive "include" option
	if (this.include) {
		files = files.filter(function (file) {
			return this.include.every(function (regEx) {
				return regEx.test(file);
			});
		}, this);
	}

	// filter out paths by the "exclude" option
	if (this.exclude) {
		files = files.filter(function (file) {
			return this.exclude.every(function (regEx) {
				return !regEx.test(file);
			});
		}, this);
	}

	// add test to the tests
	return files.map(function (file, fileNum) {
		var url, injectFile;
		var abs = path.join(root, file);

		url = '/test/' + this.slug + '/' + fileNum + '?js=' + file;

		if (fs.existsSync(abs.replace(/\.js$/, '.inject.html'))) {
			injectFile = abs.replace(/\.js$/, '.inject.html');
		}

		return {
			url: url,
			file: file,
			filename: path.basename(file),
			dir: path.dirname(file),
			abs: abs,
			injectFile: injectFile,
			injectUrl: this.injectServer ? this.injectServer + '?file=' + file : null
		};
	}, this);
};

Project.prototype.getTest = function (fileNum) {
	return this.tests()[fileNum];
};

Project.prototype.tests = function (jenkins) {
	if (this._tests === null) {
		this._tests = this.findTests(jenkins);
	}

	return this._tests;
};

// convert a provided dependency (which is an absolute file path)
// to web-accessible URIs for the given location
Project.prototype.resolveDeps = function (dep) {
	return path.join(this.baseUri, path.relative(this.root, dep)).replace(/\\/g, '/');
};

module.exports = (function () {
	var data = fs.readFileSync(path.join(__dirname, '..', 'projects.json'), 'utf8');

	if (!data) {
		console.error('Error: Failed to read projects.json');
		process.exit(1);
	}

	var projects = [];
	var projectData;

	try {
		projectData = JSON.parse(data);
	} catch (ex) {
		console.error('Error: Invalid syntax within projects.json', ex);
		process.exit(1);
	}

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
})();
