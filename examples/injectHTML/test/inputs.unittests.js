describe('inputs.js', function () {
  describe('verify the browser defaults <input> type to text', function () {
    it('should default <input> type to text', function () {
      var inputs = document.getElementsByTagName('input');
      chai.assert.equal(inputs.length, 1);
      chai.assert.equal(inputs[0].type, 'text');
    });
  });
});