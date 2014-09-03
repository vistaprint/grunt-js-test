(function () {
  // get the modules we're testing
  var modules = document.body.getAttribute('data-modules').split(',');

  // require those modules
  require(modules, function () {
    mocha.run();
  });
}());