#!/usr/bin/env node
'use strict';

var express = require('express'),
	testUtils = require('./lib/utils'),
	findDeps = require('./lib/deps');

var app = express();

var rootFolder = 'C:/vp/playpens/development/subversion/Web/www';

app.configure(function(){
	app.set('views', __dirname + '/site');
	app.locals.pretty = true;
	app.set('view engine', 'jade');
	// app.use(express.logger('dev'));
	// app.use(express.bodyParser());
	// app.use(express.methodOverride());
	app.use(express.errorHandler());

	// proxy static javascript files from vp's js-lib
	app.use('/vp/JS-Lib/js-test-env', express.static(__dirname + '/site/deps'));
	app.use('/vp/JS-Lib', express.static(rootFolder + '/vp/JS-Lib'));
});

app.get('/', function (req, res) {
	res.render('index', {
		tests: testUtils.findTests(),
	});
});

app.get('/alive', function (req, res) {
	res.send('hello world');
});

app.get('/test', function (req, res) {
	res.render('test', {
		testFile: req.query.js,
		deps: findDeps(rootFolder, req.query.js),
	});
});

app.listen(8981);