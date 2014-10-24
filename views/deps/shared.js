/* global chai:true, document:true, mocha:true, mochaPhantomJS: true */

(function (window) {
  'use strict';

  // 1.4.2 moved reporters to Mocha instead of mocha
  var Mocha = window.Mocha || window.mocha;

  // Send messages to the parent phantom.js process via alert! Good times!!
  function sendMessage() {
    var args = [].slice.call(arguments);
    if (window.PHANTOMJS) {      
      alert(JSON.stringify(args));
    } else if (window.parent !== window) {
      window.parent.postMessage(JSON.stringify(args), "*");
    }
  }

  function Reporter(runner) {
    // Setup HTML reporter to output data on the screen
    Mocha.reporters.HTML.apply(this, arguments);

    // Create a Grunt listener for each Mocha events
    // start, test, test end, suite, suite end, fail, pass, pending, end
    var events = [
      'start',
      'test',
      'test end',
      'suite',
      'suite end',
      'fail',
      'pass',
      'pending'
    ];

    // if this test is within a frame, then listen for test results
    // and resize as data is added to make the parent page usable.
    if (window.parent !== window) {
      runner.on('fail', window.parent.reportFailure);
      runner.on('pass', window.parent.reportSuccess);
    }

    // if we are generating coverage reprot data, then we need to
    // save the results after tests have completed
    if ('coverage' in document.body.dataset) {
      runner.on('end', function () {
        // save coverage data to server, on complete, let phantom know the tests are over
        saveCoverageDataToServer(function () {
          sendMessage('mocha.end');
        });
      });
    } else {
      events.push('end');
    }

    function createGruntListener(ev, runner) {
      runner.on(ev, function (test, err) {
        var data = {
          err: err
        };

        if (test) {
          data.title = test.title;
          data.fullTitle = test.fullTitle();
          data.state = test.state;
          data.duration = test.duration;
          data.slow = test.slow;
        }

        if (ev == "end") {
          data.stats = this.stats;
        }

        sendMessage('mocha.' + ev, data);
      });
    }

    for (var i = 0; i < events.length; i++) {
      createGruntListener(events[i], runner);
    }
  }

  // extend our own Reporter will all the methods of Mocha's HTML reporter
  for (var prop in Mocha.reporters.HTML.prototype) {
    Reporter.prototype[prop] = Mocha.reporters.HTML.prototype[prop];
  }

  // mocha setup config
  var setup = {
    ui: 'bdd',
    ignoreLeaks: true,
    reporter: Reporter
  };

  // add config from PHANTOMJS settings
  if (window.PHANTOMJS) {
    // Default mocha options
    // If options is a string, assume it is to set the UI (bdd/tdd etc)
    if (typeof window.PHANTOMJS === 'string') {
      config.ui = window.PHANTOMJS;
    } else {
      // Extend defaults with passed options
      for (var key in window.PHANTOMJS.mocha) {
        if (window.PHANTOMJS.mocha[key]) {
          config[key] = window.PHANTOMJS.mocha[key];
        }
      }
    }
  }

  // we need to call setup before page load,
  // this is what exposes describe() to the global
  // window object to allow the unit tests to 
  // register themselves to the test runner.
  mocha.setup(setup);

  // mocha.checkLeaks();

  window.addEventListener('load', function () {
    window.assert = chai.assert;
    window.expect = chai.expect;

    // if this is not a require.js test, then run mocha on page load
    if (document.body.getAttribute('data-modules') == '') {
      mocha.run();
    }
  }, false);

  function saveCoverageDataToServer(onComplete) {
    // window._$jscoverage is created by JSCover / JSCoverage
    // window.__coverage__ is created by Istanbul
    if (!window._$jscoverage && !window.__coverage__) {
      return;
    }

    var url = document.location.origin + '/jscoverage.json?' + (+(new Date()));

    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // request.responseText;
        if (onComplete) {
          onComplete();
        }
      }
    };
    request.onerror = function () {
      alert('There was an error saving the coverage report data. Verify server is up?');
    };
    request.setRequestHeader('Content-Type', 'text/plain');
    if (window.__coverage__) {
      request.send(JSON.stringify(window.__coverage__));
    } else {
      request.send(window.saveCoverageData(window._$jscoverage));
    }
  }

  window.jscoverage_report = saveCoverageDataToServer;
})(this);