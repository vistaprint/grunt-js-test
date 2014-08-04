# JavaScript Test Environment [![Dependency Status](https://gemnasium.com/benhutchins/js-test-env.png)](https://gemnasium.com/benhutchins/js-test-env)

## Grunt tasks

### js-test

Run all your project's client-side unit tests.

  var HELP = [
    'Locate tests that match given filters.',
    '--project     Specify project',
    '--file        Specify test file, rel to project base',
    '--re          Inc. Reg Ex run on test file names',
    '--search      Inc. str match run on test file names',
    '--mocha-grep  Inc. Reg Ex run on test descriptions',
    '--reporter    Mocha reporter to use, default Spec',
    '--bail        Exit on first failed test',
    '--coverage    Generate coverage report data'
  ];