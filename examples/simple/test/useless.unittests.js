describe('some useless unit tests', function () {
  it('truthy', function () {
    assert.equal(true, true);
    assert.equal(true, !!1);
    assert.equal(true, !!{});
    assert.equal(true, !![]);
  });

  it('falsy', function () {
    assert.equal(false, !!0);
    assert.equal(false, !!null);
    assert.equal(false, !!undefined);
  });
});
