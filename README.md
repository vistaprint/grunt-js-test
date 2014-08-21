# Grunt JavaScript Test Runner [![Dependency Status](https://gemnasium.com/benhutchins/grunt-js-test.png)](https://gemnasium.com/benhutchins/grunt-js-test)

## Getting Started

This plugin requires Grunt '~0.4.0'

```shell
npm install grunt-js-test --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-js-test');
```

## Grunt tasks

### js-test

_Run this task with the `grunt js-test` command._

Run all test files with PhantomJS. The minimal config would be:

```js
  grunt.initConfig({
    'js-test': {
        'default': {
            'options': {}
        }
    }
  });

  grunt.loadNpmTasks('grunt-js-test');

  grunt.registerTask('test', ['js-test']);
```

### js-test-server

_Run this task with the `grunt js-test-server` command._

Start a web server on your local host to allow you to run the unit tests individually.

## Options

### Command Line Interface Options

#### --coverage

Pass `--coverage` while running Grunt to turn on coverage with the default `coverageTool`. You can pass a value of a string to select the coverage tool you'd like to use, such as `--coverage=jscover`.

#### --identifier="commit deadbeef"

Pass `--identifier` with a value of a string you'd like to use as your job identifier. This will be the folder name used when savign your coverage reports to the directory configured with `coverageReportDirectory`. This is useful when using grunt-js-test through continous integration and want to provide it either the job number or the commit id (or revision number if you're still on SVN).

By default a datetime in the format of `YYYY-MM-DD HHMMSS` will be used.

### Task Options

All options of `js-test` are optional, if you specify nothing, it will run all JavaScript files anywhere in your project matching `*.unittests.js`.

#### root
Type: `String`
Default: `process.cwd()`

Defines the root path to your project files. A static file web server is started on this path to allow your unit tests to load their dependencies.

#### pattern
Type: `String|Array<String>`
Default: `**/*.unittests.js`

Glob search pattern to locate your unit tests. For more information on glob patterns please see [node-glob](https://github.com/isaacs/node-glob). This can optionally be an array of globs which will all be used to find a file matching any of the glob patterns.

#### include
Type: `Array<String|RegExp>`
Default: `[]`

Array of simple string searches or regular expression used to whitelist tests. If a test does not match all of these filters it is ignored.

#### exclude
Type: `Array<String|RegExp>`
Default: `['/node_modules/']`

Array of simple string searches or regular expressions used to blacklist tests. If a test matches one of these filters it is ignored.

#### baseUri
Type: `String`
Default: `/`

Base path used when loading web assets.

#### deps
Type: `Array<String>`
Default: `[]`

A list of paths to JavaScript files relative to your `baseUri` you want loaded as global dependencies for each test.

Dependencies can be injected on a per test file absis using `<reference>` tags. See `referenceTags` below.

#### referenceTags
Type: `Boolean`
Default: `true`

Look for `<reference>` tags within unit test files. Usually never hurts to leave it on.

#### express
Type: `Object`
Default: `{}`

Object of options to pass to the [grunt-express](https://github.com/blai/grunt-express) task. Hopefully uou never need to override anything here.

#### hostname
Type: `String`
Default: `localhost`

Hostname used for web server when running the `js-test-server` grunt task.

#### port
Type: `Number`
Default: `8981`

Port used for web server when running the `js-test-server` grunt task.

#### staticPort
Type: `number`
Default: `8982`

Port used for static web server that serves up your unit test dependency files. Should never have to change this unless something else uses this port.

#### coverageProxyPort
Type: `number`
Default: `8983`

Port used for proxy web server that instruments your javascript files for code coverage reporting. Should never have to change this unless something else uses this port.

#### mocha
Type: `Object`
Default: `{}`

Object of options to pass to the [grunt-mocha](https://github.com/kmiyashiro/grunt-mocha/) task. Hopefully uou never need to override anything here.

#### reporter
Type: `String`
Default: `Spec`

Mocha reporter used by `js-test` when reporting to the console.

#### coverage
Type: `Boolean`
Default: `false`

Should the test environment generate coverage reports? This can slow down running the tests, but will generate you code coverage reporting data.

#### coverageTool
Type: `String`
Default: `jscover`

Choose between either `jscover` or `istanbul` for your coverage instrumentation and reporting service.

#### coverageReportDirectory
Type: `String`
Default: `process.cwd() + '/coverage'`

Specify a directory where coverage report data should be saved.

#### Filters

These filters allow you to narrow down the tests you run via the `js-test` CLI. This is useful when updating a single test or when using grunt-js-test from a continuous integration service.

    file: null,                     // run only this file, by file name
    re: null,                       // run tests with file names that match this regular expression
    search: null,                   // run tests with file names that contain the string passed (case insensitive)
    bail: false,                    // if true we'll stop running tests once we find a single failure
    grep: false,                    // passed to mocha, runs a regex test on the test descriptions
    log: false,                     // if true, will pass console.log data from phantomjs to node console for debugging

#### require
Type: `Boolean`
Default: `false`

This identifies your project as being a requirejs based project, which means that we do not include your test file directly but instead allow [require.js](http://requirejs.org/) to load it.

#### modulesRelativeTo
Type: `String`
Default: `null`

This defines the path your modules should be relative to, if it's different than your project's `root` directory. Only applicable when your project is a `requirejs` based project.

#### injectHTML
Type: `String`
Default: `null`

Optional raw HTML string that added to all of the test pages generated by grunt-js-test. You can load files using this command by using the `fs` module, example: `require('fs').readFileSync('tests/setup.html')`.

#### injectServer
Type: `String`
Default: `null`

Optional web server address that provides HTML responses that should be injected into test pages. Similar to ``injectHTML``. This can be used to inject rendered templates into your tests, if needed.

An example value would be: `http://localhost:3000/dev/render`

A request will be made to the url you provide and will provide the test file with it's path relative from the `root` directory as a query string paramater `file`. Example: `?file=test/example.unittests.js`