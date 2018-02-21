// <reference path="../js/breakpoints.js" />

describe("example tests", function () {

    var assert = chai.assert;

    it("should fail", function() {
        assert.fail(1, 2, "One doesn't equal two, you idiot!");
    });

    it("should also fail", function() {
        assert.fail(1, 2, "One doesn't equal two, again, you idiot!");
    });

    it("should succeed", function() {
        assert.equal(1, 1);
    });
});