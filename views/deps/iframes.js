function reportSuccess() {
	var el = document.getElementById('passes');
	var passes = parseInt(el.innerHTML, 10);
	el.innerHTML = ++passes;
}

function reportFailure() {
	var el = document.getElementById('failures');
	var failures = parseInt(el.innerHTML, 10);
	el.innerHTML = ++failures;
}

(function() {

	var currentTestIndex = 0;
	var currentTestUrl;

	function nextTest() {
		currentTestUrl = window.__tests__[currentTestIndex];
		currentTestIndex ++;

		if (!currentTestUrl) {
			return;
		}

		$('#testFrame').attr('src', currentTestUrl + '&iframe=1');		
	}

	this.runAllTests = function() {
		var failures = 0;
		window.addEventListener('message', function(message) {
			var data = JSON.parse(message.data);
			var event = data[0];
			if (event == 'mocha.suite end') {
				var stats = data[1].stats;
				failures += stats.failures;
			}
			if (event == 'mocha.end') {
				var $testLink = $('<a>', { 
					html: currentTestUrl, 
					href: currentTestUrl,
					target: 'blank'
				});

				if (failures > 0) {
					$testLink.appendTo('#failing');
					failures = 0;
				} else {
					$testLink.appendTo('#passing');
				}
	
				nextTest();
			}	
			if (event == 'mocha.fail') {
				console.log(data[1].err);
			}
		}, false);

		nextTest();
	};

})(this);