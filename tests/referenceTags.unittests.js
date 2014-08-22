var assert = require('assert');
var path = require('path');

var utils = require('../tasks/lib/utils')({});

describe('<reference> tags', function () {
	it('should find all dependencies', function () {
		var references = utils.findReferenceTags(path.join(__dirname, 'referenceTags.example.txt'));
		assert(references.length === 3);
		assert(references, [
			path.join(__dirname, 'something.js'),
			path.join(__dirname, 'something.html'),
			path.join(__dirname, 'useless.png'),
		]);
	});

	it('should filter to only JavaScript files', function () {
		var references = utils.findReferenceTags(path.join(__dirname, 'referenceTags.example.txt'), '.js');
		assert(references.length === 1);
		assert(references, [
			path.join(__dirname, 'something.js'),
		]);
	});
});