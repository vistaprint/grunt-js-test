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
	app.use(express.bodyParser({ limit: '200mb' }));
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
			next();
		});

		// static file root
		// app.use(use.baseUri, require('./lib/static')(use.root));
		app.use(use.baseUri, express.static(use.root));

		if (!project.port) {
			project.port = _port++;
		}

		app.listen(project.port);
	});

	// coverage report proxy server
	var http = require('http');
	var request = require('request');

	// setup request object with a proxy
	var r = request.defaults({'proxy': 'http://127.0.0.1:3128'});

	project.statics.forEach(function () {
		var proxy = http.createServer(function (req, resp) {
			r.get('http://127.0.0.1:' + project.port  + req.url).pipe(resp);
		});

		if (!project.coveragePort) {
			project.coveragePort = _port++;
		}

		proxy.listen(project.coveragePort);
	});
});

// list tests for all projects
app.get('/', function (req, res) {
	res.render('index', {
		projects: projects,
		allProjects: projects
	});
});

app.get('/alive', function (req, res) {
	res.send('hello world');
});

// list all tests for a given project
app.get('/:project', function (req, res) {
	var project = projects[req.params.project];

	if (!project) {
		return res.status(404).send('Project not found. Go back.');
	}

	res.render('index', {
		project: project,
		projects: [project],
		allProjects: projects
	});
});

// jscover page, in case someone makes this request by mistake
app.get('/:project/jscoverage', function (req, res) {
	var project = projects[req.params.project];

	if (!project) {
		return res.status(404).send('Project not found. Go back.');
	}

	res.render('jscoverage', {
		project: project,
		projectBaseUri: project.getBaseUri(req.host, false),
	});
});

// jscoverage json report for a given project
app.get('/:project/jscoverage.json', function (req, res) {
	var project = projects[req.params.project];

	if (!project) {
		return res.status(404).send('Project not found. Go back.');
	}

	if (project.doesCoverageReportExist()) {
		res.status(200).sendfile(project.getCoverageReportFile());
	} else {
		res.status(404).send({
			success: false,
			message: 'Coverage report data does not exist for project.'
		});
	}
});

// store the jscover report to disk
app.post('/:project/jscoverage.json', function (req, res) {
	var project = projects[req.params.project];

	// we need data to write to the file
	if (!req.body.json || !project) {
		return res.status(500).send('Project not found or no JSON data provided.');
	}

	var file = project.getCoverageReportFile();

	// ensure the reports folder exists
	var reportsFolder = path.join(__dirname, 'jscover', 'reports');
	if (!fs.existsSync(reportsFolder)) {
		fs.mkdirSync(reportsFolder);
	}

	// ensure the project folder exists
	if (!fs.existsSync(path.dirname(file))) {
		fs.mkdirSync(path.dirname(file));
	}

	fs.writeFile(file, req.body.json, function (err) {
		if (err) {
			res.status(500).send({success: false});
		} else {
			res.send('success');
		}
	});
});

// run all tests for a given project
app.get('/:project/all', function (req, res) {
	var project = projects[req.params.project];

	// determine if we want to generate coverage reports
	var coverage = !!(req.query.coverage || false);

	// we run each each test in isolation, which creates an iframe
	// to /test/:project/:test for each test
	res.render('test-all-isolate', {
		project: project,
		coverage: coverage,
	});
});

/*app.get('/:project/all-old', function (req, res) {
	var testFiles = [];
	var project = projects[req.params.project];

	// determine if we want to generate coverage reports
	var coverage = !!(req.query.coverage || false);

	// if we are running each test in isolation, we will
	// actually create an iframe and all /test/:project/:test
	// method below
	if (project.isolate) {
		res.render('test-all-isolate', {
			project: project,
			coverage: coverage,
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

		var coverageData = coverage && project.doesCoverageReportExist() ? fs.readFileSync(project.getCoverageReportFile()) : null;

		res.render('test', {
			all: true,
			defaultBaseUri: '//' + req.host + ':' + PORT,
			projectBaseUri: project.getBaseUri(req.host, coverage),
			project: project,
			modules: modules.length > 0 ? modules.join(',') : '',
			deps: deps.map(project.resolveDeps),
			coverage: coverage,
			coverageData: coverageData
		});
	}
});*/

app.get('/test/:project/:test', function (req, res) {
	var project = projects[req.params.project];
	var test = project.getTest(req.params.test);

	// if we do not have this test, 404?
	if (!test) {
		return res.status(404).send('Project not found. Go back.');
	}

	var file = test.abs;
	var deps = findDeps(file, project.requirejs);
	var moduleName;

	// determine if we want to generate coverage reports
	var coverage = !!(req.query.coverage || false);

	// attempt to find the module name for this file
	if (project.requirejs) {
		moduleName = path.relative(project.requirejs.modulesRelativeTo, file).replace(/\\/g, '/').replace(/\.js$/, '');
	}

	function render(injectHTML) {
		var coverageData;

		if (coverage && project.doesCoverageReportExist()) {
			coverageData = fs.readFileSync(project.getCoverageReportFile());
		}

		res.render('test', {
			defaultBaseUri: '//' + req.host + ':' + PORT,
			projectBaseUri: project.getBaseUri(req.host, coverage),
			project: project,
			modules: moduleName || '',
			injectHTML: injectHTML || '',
			test: test,
			deps: deps.map(project.resolveDeps),
			coverage: coverage,
			coverageData: coverageData
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

if (require.main === module) {
	try {
		app.listen(PORT);
	} catch (ex) {
		console.error('Confirm the server is not already running');
	}
}

module.exports = app;