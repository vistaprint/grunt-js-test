# Coverage Tools

This page describes coverage tools supported by `grunt-js-test` and how to implement support for new tools.

## Supported coverage tools

* [Istanbul](https://gotwarlost.github.io/istanbul/)

  set option `coverageTool` to `istanbul` in your `Gruntfile.js`

* [JSCover](https://tntim96.github.io/JSCover/)

  set option `coverageTool` to `jscover` in your `Gruntfile.js`

## Adding a new coverage tool

It is fairly complicated at this point to add support for new coverage reporters, however, this readme contains the outline of what it takes for a new coverage tool to be added.

### Module outline

A coverage tool must return as its sole export a function that accepts three arguments as described below. An example of this:

```js
module.exports = function (grunt, options, reportDirectory) {
  return {};
};
```

#### Arguments

##### grunt

Instance of `Grunt` with all its batteries included. All logging should rely on `grunt.log` and `grunt.verbose` or similar features available through Grunt.

##### options

Reference to the `options` given in the `Gruntfile.js` for the project. If your coverage tool needs to provide it's own configuration options use a pattern similar to `options.toolName` object. For example, `options.jscover` and `options.istanbul` are used for their implementations.

##### reportDirectory

Save and read all necessary files from this given report directory. When a project is generated new coverage data you will be saving coverage data to this directory per test file (see the `save` method). Upon completion of all tests running `aggregate` will be called where your instrumentation should aggregate all the given data into a single file and generate a report which is saved to this directory.

An example directory may look like `/projects/my-project/coverage/commit deadbeef/istanbul/`. It will always be unique to the report we are generating.

### Required methods

The module export function, when called, must return an `Object` with the following keys defined.

#### `start: function () {}`

Start a server that serves the instrumented code for your coverage tool.

#### `save: function (coverageData, callback) {}`

Save the provided `coverageData`. This will only be part of the coverage data for the entire project that will be accumulated and you should not generate reports at this time, that is done within `aggregate`. If needed you can save temporary files to the provided `reportDirectory`, however you should usually be able to keep the data in memory until `aggregate` is called.

At the end of saving the coverage data, call the provided `callback` which optionally accepts an `error` for its first argument.

#### `aggregate: function (callback) {}`

Aggregate and combine all the provided coverage data and generate a report, saving the results to `reportDirectory`.

At the end of generating the coverage report, call the provided `callback` which optionally accepts an `error` for its first argument.