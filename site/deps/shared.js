mocha.setup("bdd");

window.addEventListener('load', function () {
	// sendMessage('test');
	window.assert = chai.assert;
	mocha.run();
}, false);