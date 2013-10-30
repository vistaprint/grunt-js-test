#!/usr/bin/env node
'use strict';

var express = require('express'),
	testUtils = require('./lib/utils'),
	findDeps = require('./lib/deps');

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
	app.use('/vp/JS-Lib/js-test-env', express.static(__dirname + '/site/deps'));
	app.use('/vp/JS-Lib', express.static('C:/vp/playpens/development/subversion/Web/www/vp/JS-Lib'));
});

app.get('/', function (req, res) {
	res.render('index', {
		tests: testUtils.findTests(),
	});
});

app.get('/all', function (req, res) {
	// get an array of all test files to find their dependencies for
	var testFiles = testUtils.findTests().map(function (test) {
		return test.file;
	});

	res.render('all-tests', {
		deps: findDeps(testFiles),
	});
});

app.get('/alive', function (req, res) {
	res.send('hello world');
});

app.get('/test', function (req, res) {
	var deps = findDeps(req.query.js);

	res.render('test', {
		testFile: req.query.js,
		deps: deps,
	});
});

app.listen(8981);