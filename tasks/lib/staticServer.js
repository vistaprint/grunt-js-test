var express = require('express');

module.exports = function (grunt, options) {
  // create a static file server for project assets
  var statics = express();

  // ensure all responses are utf8 and are accessible cross-domain
  // this is needed so we can perform ajax requests to get the contents
  // of these static files from within the coverage report viewer
  statics.use(function (req, res, next) {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.end();
      return;
    }

    next();
  });

  statics.use(options.baseUri, express.static(options.root, { maxAge: 0 }));
  var server = statics.listen(options.staticPort);

  server.on('error', function (err) {
    grunt.log.writeln('Error occurred on static file server', err);
  });

  server.timeout = options.serverTimeout;

  return server;
};
