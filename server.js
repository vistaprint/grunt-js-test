#!/usr/bin/env node
'use strict';

var express = require('express'),
	findDeps = require('./lib/deps'),
	projects = require('./lib/projects'),
	path = require('path');

var app = express();

// default port for js-test-env
var PORT = 8981;

app.configure(function () {
	app.set('views', __dirname + '/site');
	app.locals.pretty = true;
	app.set('view engine', 'jade');
	// app.use(express.logger('dev'));
	// app.use(express.bodyParser());
	// app.use(express.methodOverride());
	app.use(express.errorHandler());

	// proxy static js-test-env javascript files
	app.use('/js-test-env', express.static(__dirname + '/site/deps'));
});

// allow projects to proxy through their own asset files
var _port = 8990;
projects.forEach(function (project) {
	project.statics.forEach(function (use) {
		var app = express();
		app.use(use.baseUri, express.static(use.root));
		if (!project.port) {
			project.port = _port++;
		}
		app.listen(project.port);
	});
});

// list tests for all projects
app.get('/', function (req, res) {
	res.render('index', {
		projects: projects,
		allProjects: projects
	});
});

// list all tests for a given project
app.get('/:project', function (req, res) {
	var project = projects[req.params.project];

	res.render('index', {
		project: project,
		projects: [project],
		allProjects: projects
	});
});

// run all tests for a given project
app.get('/:project/all', function (req, res) {
	var testFiles = [];
	var project = projects[req.params.project];

	if (project.isolate) {
		res.render('test-all-isolate', {
			project: project
		});
	} else {
		project.tests().map(function (test) {
			testFiles.push(test.abs);
		});

		var deps = findDeps(testFiles, project.requirejs);
		var modules = [];

		// attempt to find the module name for this file
		if (project.requirejs) {
			modules = project.tests().map(function (test) {
				return path.relative(project.requirejs.modulesRelativeTo, test.abs).replace(/\\/g, '/').replace(/\.js$/, '');
			});
		}

		res.render('test', {
			all: true,
			defaultBaseUri: 'http://localhost:' + PORT,
			project: project,
			modules: modules.length > 0 ? modules.join(',') : '',
			deps: deps.map(project.resolveDeps),
		});
	}
});

app.get('/test/:project/:test', function (req, res) {
	var project = projects[req.params.project];
	var test = project.getTest(req.params.test);
	var file = test.abs;
	var deps = findDeps(file, project.requirejs);
	var module;

	// attempt to find the module name for this file
	if (project.requirejs) {
		module = path.relative(project.requirejs.modulesRelativeTo, file).replace(/\\/g, '/').replace(/\.js$/, '');
	}

	res.render('test', {
		defaultBaseUri: 'http://localhost:' + PORT,
		project: project,
		modules: module || '',
		test: test,
		deps: deps.map(project.resolveDeps),
	});
});

app.get('/alive', function (req, res) {
	res.send('hello world');
});

if (require.main === module) {
	try {
		app.listen(PORT);
	} catch (ex) {
		console.error('Confirm the server is not already running');
	}
}

module.exports = app;