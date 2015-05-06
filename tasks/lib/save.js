'use strict';

module.exports = function (grunt, server, app, options, done) {
  // js-test runs three web servers, we need to close them all
  var serverClosed = false;
  var staticServerClosed = false;
  var coverageServerClosed = options.coverage ? false : true;

  // once a single server has closed, check to see if the others are closed as well, if so, complete task
  var checkAll = function () {
    if (serverClosed && staticServerClosed && coverageServerClosed) {
      // task can now be considered done
      done(true);
    }
  };

  server.close(function () {
    serverClosed = true;
    checkAll();
  });

  app.staticServer.close(function () {
    staticServerClosed = true;
    checkAll();
  });

  // now save the coverage report data if we should
  if (options.coverage) {
    grunt.log.writeln('Generating coverage report.');

    app.saveCoverageReport(options.coverageFormat, function (err) {
      if (err) {
        grunt.log.error('Failed to generate coverage report.');
      }

      var coverageDone = function () {
        coverageServerClosed = true;
        checkAll();
      };

      if (app.coverageServer.close) {
        app.coverageServer.close(coverageDone);
      } else {
        coverageDone();
      }
    });
  }
};
