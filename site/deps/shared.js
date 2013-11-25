mocha.setup('bdd');

window.addEventListener('load', function () {
	window.assert = chai.assert;
    window.expect = chai.expect;

    // if this is not a require.js test, then run mocha on page load
	if (!$('body').data('module')) {
		mocha.run();
	}
}, false);