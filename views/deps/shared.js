(function (window) {
	function debounce(func, threshold) {
		var timeout;
		return function debounced () {
			var obj = this;
			var args = arguments;

			function delayed () {
				func.apply(obj, args);
				timeout = null;
			}

			if (timeout) {
				clearTimeout(timeout);
			}

			timeout = setTimeout(delayed, threshold || 100);
		};
	}

	function Reporter(runner) {
		// Setup HTML reporter to output data on the screen
		window.Mocha.reporters.HTML.call(this, runner);

		function fixHeight(test, err) {
			try {
				window.parent.fixIframe(window);
			} catch (ex) {
				debugger;
			}
		}

		// Create a Grunt listener for each Mocha events
		// start, test, test end, suite, suite end, fail, pass, pending, end
		runner.on('test end', debounce(fixHeight, 200));
		runner.on('fail', window.parent.reportFailure);
		runner.on('pass', window.parent.reportSuccess);
		runner.on('end', fixHeight);
	}

	if (window.parent !== window) {
		mocha.setup({
			ui: 'bdd',
			reporter: Reporter
		});
	} else {
		mocha.setup('bdd');
	}

	window.addEventListener('load', function () {
		window.assert = chai.assert;
		window.expect = chai.expect;

		// if this is not a require.js test, then run mocha on page load
		if (!document.body.dataset.modules) {
			if (window.mochaPhantomJS) {
				mochaPhantomJS.run();
			} else {
				mocha.run();
			}
		}
	}, false);
})(this);