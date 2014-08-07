// This test will run in a browser, so you can work with global variables and the DOM.
describe('Browser Support', function () {
  describe('Arrays', function () {
    it('Array.prototype.forEach', function () {
      assert.equal(typeof Array.prototype.forEach, 'function');
    });
  });

  describe('Objects', function () {
    it('Object.freeze', function () {
      assert.equal(typeof Object.freeze, 'function');

      if (typeof Object.freeze === 'function') {
        var o = {
          v: true
        };

        Object.freeze(o);

        o.v = false;

        assert.equal(o.v, true);
      }
    });
  });

  describe('DOM', function () {
    it('Element.prototype.querySelector', function () {
      assert.equal(typeof Element.prototype.querySelector, 'function');

      if (typeof Element.prototype.querySelector === 'function') {
        assert.equal(document.body.querySelector('#mocha'), document.getElementById('mocha'));
      }
    });
  });
});
