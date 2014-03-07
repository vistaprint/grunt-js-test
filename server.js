#!/usr/bin/env node
'use strict';

var express = require('express'),
	findDeps = require('./lib/deps'),
	projects = require('./lib/projects'),
	path = require('path'),
	fs = require('fs');

var app = express();

// default port for js-test-env
var PORT = 8981;

app.configure(function () {
	app.locals.pretty = true;
	app.set('view engine', 'jade');
	// app.use(express.logger('dev'));
	// app.use(express.bodyParser());
	// app.use(express.methodOverride());
	app.use(express.errorHandler());

	// proxy static js-test-env javascript files
	app.use('/js-test-env', express.static(__dirname + '/views/deps'));
});

// allow projects to proxy through their own asset files
var _port = 8990;
projects.forEach(function (project) {
	project.statics.forEach(function (use) {
		var app = express();

		// ensure all responses are utf8 and are accessible cross-domain
		app.use(function (req, res, next) {
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Headers', 'X-Requested-With');
			if (/.*\.js/.test(req.path)) {
				res.charset = 'utf-8';
			}
			next();
		});

		// static file root
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

// jscover page, in case someone makes this request by mistake
app.get('/jscoverage.html', function (req, res) {
	// if they're on the right hostname, this should be picked up by the proxy server
	if (req.host === 'localhost-proxy') {
		res.send('<h1>Error</h1><p>Ensure you have configured the HTTP Proxy for your web browser as described <a href="http://vistawiki.vistaprint.net/wiki/JavaScript_test_environment#Coverage_Reports">on the wiki</a> to <code>localhost:3128</code>.</p>');
	}
	// if they're not on the right hostname, they are never going to get a useful page here
	else {
		res.send('<h1>Error</h1><p>Please make this request using the jscover proxy at <a href="http://localhost-proxy:8981/jscoverage.html">http://localhost-proxy:8981/jscoverage.html</a></p>');
	}
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

// jscover report for a given project
app.get('/:project/jscover', function (req, res) {
	res.render('jscoverage');
});

// jscoverage json report for a given project
app.get('/:project/jscoverage.json', function (req, res) {
	res.status(200).sendfile(projects[req.params.project].getCoverageReportFile());
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
			defaultBaseUri: '//' + req.host + ':' + PORT,
			projectBaseUri: project.getBaseUri(req.host),
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
	var moduleName;

	// attempt to find the module name for this file
	if (project.requirejs) {
		moduleName = path.relative(project.requirejs.modulesRelativeTo, file).replace(/\\/g, '/').replace(/\.js$/, '');
	}

	function render(injectHTML) {
		res.render('test', {
			defaultBaseUri: '//' + req.host + ':' + PORT,
			projectBaseUri: project.getBaseUri(req.host),
			project: project,
			modules: moduleName || '',
			injectHTML: injectHTML || '',
			test: test,
			deps: deps.map(project.resolveDeps),
		});
	}

	// if test has an inject HTML file, inject it
	if (test.injectFiles && test.injectFiles.length > 0) {
		var injectHTML = '';
		test.injectFiles.forEach(function (injectFile) {
			injectHTML += fs.readFileSync(injectFile);
		});
		render(injectHTML);
	}
	// if the test has an inject URL, request it and inject it
	else if (test.injectUrl) {
		require('http').get(test.injectUrl, function (res) {
			var data = '';

            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
				render(data);
			});
		}).on('error', function () {
			console.log('Error requesting inject url!');
			render(null);
		});
	}
	// no inject HTML, most tests go here, just render the response
	else {
		render(null);
	}
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