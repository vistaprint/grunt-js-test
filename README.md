# Grunt JavaScript Test Runner [![Build Status](https://secure.travis-ci.org/vistaprint/grunt-js-test.png?branch=master)](http://travis-ci.org/vistaprint/grunt-js-test) [![Dependency Status](https://gemnasium.com/vistaprint/grunt-js-test.png)](https://gemnasium.com/vistaprint/grunt-js-test)

grunt-js-test is a plugin for [Grunt](http://gruntjs.com/) that is designed to run client-side unit tests using [Mocha](https://mochajs.org/). You can easily run tests through the command line or a continuous integration suite using PhantomJS or it can provide a server to run your tests in a browser using WebDriver and for writing and testing of unit tests. grunt-js-test can also generate coverage reports using either [JSCover](https://tntim96.github.io/JSCover/) or [Istanbul](https://gotwarlost.github.io/istanbul/).

## Getting Started

This plugin requires Grunt '~0.4.0'

```shell
npm install grunt-js-test --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-js-test');
```

### Configure your Grunt task

Open your `Gruntfile.js` and add your project's configuration as desired (all the options are described below). If you rely on all the defaults, you don't even need to provide anything.

A few simple example projects are available in the [examples](https://github.com/vistaprint/grunt-js-test/tree/master/examples) directory.

### Write your tests

Tests are loaded already wrapped up including [Mocha](http://mochajs.org/), [Chai](http://chaijs.com/) and [Sinon](http://sinonjs.org/). This means you are good to start writing tests immediately.

A simple example unit test using Mocha:

```js
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      chai.assert.equal(-1, [1,2,3].indexOf(5));
      chai.assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});
```

If you prefer to use another assert library other than Chai, you can optionally include it as a dependency (see `deps` option below).

#### Loading dependencies

grunt-js-test generates the test HTML page for you, making it quicker to write client-side tests. However, this means that you need a way to load the dependent JavaScript files. grunt-js-test supports [require.js](http://requirejs.org/) projects natively, simply configure the options `requirejs` and `modulesRelativeTo` as needed. If you are not creating a require.js based project, then grunt-js-test implements support for [JScript IntelliSense Reference Tags](http://blogs.msdn.com/b/webdev/archive/2007/11/06/jscript-intellisense-a-reference-for-the-reference-tag.aspx). This allows you to easily load dependencies using a format of:

```js
/// <reference path="../relative/file.js" />
```

There is an example project using these reference tags in our [examples](https://github.com/vistaprint/grunt-js-test/tree/master/examples) directory as [examples/references](https://github.com/vistaprint/grunt-js-test/tree/master/examples/references).

These reference tags are processed recursively and a dependency tree is created, then sorted, to generate a complete list of dependencies needed in an appropriate order. Therefore you can include files such as:

*test.js*

```js
/// <reference path="test.setup.html" />
/// <reference path="dosomething.js" />
````

*dosomething.js*
```js
/// <reference path="library.js" />
/// <reference path="app.css" />
````

and so on. Until a tree is built like:

```text
- js:
  library.js
  dosomething.js
  test.js
- css:
  app.css
- html:
  test.setup.html
```

When rendering the test page, all of these dependencies will be included. You can disable all of this functionality if not desired by setting the `referenceTags` option to `false`.

#### Adding custom HTML to test pages

As grunt-js-test generates the test HTML pages for you, on occasion you need to add some HTML to the DOM of the page prior to your JavaScript running. There are two ways to do this, the easiest is to simply create a file named `.inject.html` alongside your test JavaScript file.

For example, if you had a test file called `something.unittests.js` you could have a similarly named file `something.unittests.inject.html`, the contents of which would be added to the body of the generated test page.

There is an example project using these reference tags in our [examples](https://github.com/vistaprint/grunt-js-test/tree/master/examples) directory as [examples/injectHTML](https://github.com/vistaprint/grunt-js-test/tree/master/examples/injectHTML).

You can also reference `.html` files you wish to have injected using a `reference` tags similar to referencing JavaScript dependencies. The format of which is simply:

```js
/// <reference path="../relative/path/to/file/to/inject.html" />
```

#### Adding CSS stylesheets to test pages

If you need to add a dependency for a stylesheet, you can include one globally using the `stylesheets` option or include one on a per-test-file basis using reference tags similarly to how they are used for JavaScript and HTML file dependencies. The format of which is simply:

```js
/// <reference path="../relative/path/to/stylesheet/to/include.css" />
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

Pass `--identifier` with a value of a string you'd like to use as your job identifier. This will be the folder name used when saving your coverage reports to the directory configured with `coverageReportDirectory`. This is useful when using grunt-js-test through continuous integration and want to provide it either the job number or the commit id (or revision number if you're still on SVN).

By default a datetime in the format of `YYYY-MM-DD HHMMSS` will be used.

#### Filters

These filters allow you to narrow down the tests you run via the `js-test` CLI. These can be useful when you want are writing a test and want to test it, or a single test is failing and you want to debug it.

##### --file

Pass `--file=test/something.js` to provide the path to a specific file you want to run.

##### --search

Pass `--search=jquery` with a simple string run only the tests that have file names containing the given string. This filter is always case insensitive. You can use `*` for a wildcard match.

##### --bail

Pass `--bail` to stop running tests once a single unit test fails.

##### --reporter

Pass `--reporter=reporter` to specify the reporter to use when running tests.

##### --log

Pass `--log` to pass all `console.log` statements from your unit tests from PhantomJS to the Node console.

### Task Options

All options of `js-test` are optional, if you specify nothing, it will run all JavaScript files anywhere in your project directory, recursively matching `*.unittests.js`.

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

A list of paths to JavaScript files relative to your `baseUri` you want loaded as global dependencies for each test. You can also include external dependencies, such as `http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.js`.

Dependencies can be injected on a per test file basis using `<reference>` tags. See [loading dependencies](https://github.com/vistaprint/grunt-js-test#loading-dependencies).

#### stylesheets
Type: `Array<String>`
Default: []

A list of paths to CSS files relative to your `baseUri` you want loaded for each test. You can also include external stylesheets.

Stylesheets can be injected on a per test file basis using `<reference>` tags. See [loading dependencies](https://github.com/vistaprint/grunt-js-test#loading-dependencies).

#### referenceTags
Type: `Boolean`
Default: `true`

Look for `<reference>` tags within unit test files to automatically include additional dependencies. See [loading dependencies](https://github.com/vistaprint/grunt-js-test#loading-dependencies). Usually never hurts to leave it on.

#### hostname
Type: `String`
Default: `localhost`

Hostname for web server when running the `js-test-server` grunt task.

#### port
Type: `Number`
Default: `8981`

Port for web server when running the `js-test-server` grunt task.

#### staticPort
Type: `number`
Default: `8982`

Port used for static web server that serves up your unit test dependency files. Should never have to change this unless something else uses this port.

#### coverageProxyPort
Type: `number`
Default: `8983`

Port used for proxy web server that instruments your JavaScript files for code coverage reporting. Should never have to change this unless something else uses this port.

#### phantomOptions
Type: `Object`
Default: `phantomOptions: {
            timeout: 20000
          }`

Object of options to pass to [PhantomJS](http://phantomjs.org/api/command-line.html)

#### reporter
Type: `String`
Default: `Spec`

Mocha reporter used by `js-test` when reporting to the console.

Supported reporters are Spec, `Nyan`, `XUnit`, `Dot`, `List`, `Progress`, `JSON`, `Min` and `Doc`. For a more complete list, see [Mocha reporters](http://mochajs.org/#reporters). The reporter value is case sensitive. `Min` and `Dot` are very helpful when debugging a failing test.

#### coverage
Type: `Boolean`
Default: `false`

Should the test environment generate coverage reports? This can slow down running the tests, but will generate you code coverage reporting data.

#### coverageTool
Type: `String`
Default: `istanbul`

Choose between either `jscover` or `istanbul` for your coverage instrumentation and reporting service.

#### coverageReportDirectory
Type: `String`
Default: `process.cwd() + '/coverage'`

Specify a directory where coverage report data should be saved.

#### requirejs
Type: `Boolean`
Default: `false`

This identifies your project as being a requirejs based project, which means that we do not include your test file directly but instead allow [require.js](http://requirejs.org/) to load it.

#### modulesRelativeTo
Type: `String`
Default: `null`

This defines the path your modules should be relative to, if it's different than your project's `root` directory. Only applicable when your project is a `requirejs` based project.

#### injectQueryString
Type: `String`
Default: `null`

Optional query string data to add to URLs when unit tests are running via the `js-test` command. Format must be a string with no prefixed ampersand. Example: `key=value&key2=value2`.

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
