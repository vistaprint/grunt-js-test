#!/usr/bin/env node
'use strict';

var express = require('express'),
	findDeps = require('./lib/deps'),
	projects = require('./lib/projects'),
	path = require('path');

var app = express();

app.configure(function () {
	app.set('views', __dirname + '/site');
	app.locals.pretty = true;
	app.set('view engine', 'jade');
	// app.use(express.logger('dev'));
	// app.use(express.bodyParser());
	// app.use(express.methodOverride());
	app.use(express.errorHandler());

	// proxy static javascript files from vp's js-lib
	app.use('/js-test-env', express.static(__dirname + '/site/deps'));
});

// allow projects to proxy through their own asset files
// var _port = 8990;
projects.forEach(function (project) {
	project.statics.forEach(function (use) {
		// var app = express();
		app.use(use.baseUri, express.static(use.root));
		// location.port = _port++;
		// app.listen(project.port);
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

	project.tests().map(function (test) {
		testFiles.push(test.abs);
	});

	var deps = findDeps(testFiles, project.requirejs);

	deps = deps.map(function (dep) {
		return path.join(project.baseUri, path.relative(project.root, dep)).replace(/\\/g, '/');
	});

	res.render('all-tests', {
		project: project,
		// tests: tests,
		deps: deps,
	});
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

		// remove the module from deps
		deps.splice(deps.length - 1, 1);
	}

	// convert the list of deps (which is a list of absolute file paths)
	// to web-accessible URIs for the given location
	deps = deps.map(function (dep) {
		return /*'http://localhost:' + project.port +*/ path.join(project.baseUri, path.relative(project.root, dep)).replace(/\\/g, '/');
	});

	res.render('test', {
		project: project,
		module: module || '',
		test: test,
		deps: deps,
	});
});

if (require.main === module) {
	try {
		app.listen(8981);
	} catch (ex) {
		console.error('Confirm the server is not already running');
	}
}

module.exports = app;