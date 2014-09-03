// This test will run in a browser, so you can work with global variables and the DOM.
describe('Arrays', function () {
  it('Array.prototype.forEach', function () {
    assert.equal(typeof Array.prototype.forEach, 'function');
  });

  it('Array.prototype.filter', function () {
    assert.equal(typeof Array.prototype.filter, 'function');

    var stuff = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

    assert.deepEqual(
      stuff.filter(function (value) { return /^[0-9]+/.test(value); }),
      '0123456789'.split('')
    );
  });

  it('Array.prototype.map', function () {
    assert.equal(typeof Array.prototype.map, 'function');

    var numbers = '0123456789'.split('');

    assert.deepEqual(
      numbers.map(function (value) { return parseInt(value, 10); }),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    );
  });
});
