/// <reference path="../js/math.js" />

describe('math.js', function () {
  describe('point intersects circle', function () {
    it('point should intersect at center of circle', function () {
      chai.assert.ok(Trig._private.pointIntersectsCircle(
        new Trig.Point(50, 50),
        new Trig.Circle(50, 50, 10)
      ));
    });

    var circle = new Trig.Circle(50, 50, 10);

    it('point should intersect within radius of circle', function () {
      var point = new Trig.Point(45, 45);
      chai.assert.ok(point.intersects(circle));
    });

    it('point should intersect at north boundary', function () {
      var distance = circle.y - circle.r;
      var point = new Trig.Point(circle.x, distance);
      chai.assert.ok(point.intersects(circle));
    });

    it('point should intersect at east boundary', function () {
      var distance = circle.x + circle.r;
      var point = new Trig.Point(distance, circle.y);
      chai.assert.ok(point.intersects(circle));
    });

    it('point should intersect at south boundary', function () {
      var distance = circle.y + circle.r;
      var point = new Trig.Point(circle.x, distance);
      chai.assert.ok(point.intersects(circle));
    });

    it('point should intersect at west boundary', function () {
      // test boundary of all sides at 90 degree angles
      var distance = circle.x - circle.r;
      var point = new Trig.Point(distance, circle.y);
      chai.assert.ok(point.intersects(circle));
      chai.assert.ok(circle.intersects(point));
    });

    it('point should intersect - real world test', function () {
      var circle = new Trig.Circle(472, 510.5, 200);
      var point = new Trig.Point(353, 353);
      chai.assert.ok(point.intersects(circle));
      chai.assert.ok(circle.intersects(point));
    });
  });

  describe('point does not intersect circle', function () {
    it('should not intersect', function () {
      chai.assert.notOk(Trig._private.pointIntersectsCircle(
        new Trig.Point(), // the default point is 0,0
        new Trig.Circle(50, 50, 10)
      ));
    });

    var circle = new Trig.Circle(50, 50, 10);

    it('should not intersect', function () {
      var point = new Trig.Point(10, 10);
      chai.assert.notOk(point.intersects(circle));
      chai.assert.notOk(circle.intersects(point));
    });

    it('should not intersect outisde north boundary', function () {
      var distance = circle.y - circle.r - 1;
      var point = new Trig.Point(circle.x, distance);
      chai.assert.notOk(point.intersects(circle));
      chai.assert.notOk(circle.intersects(point));
    });

    it('should not intersect outisde east boundary', function () {
      var distance = circle.x + circle.r + 1;
      var point = new Trig.Point(distance, circle.y);
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde south boundary', function () {
      var distance = circle.y + circle.r + 1;
      var point = new Trig.Point(circle.x, distance);
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde west boundary', function () {
      // test boundary of all sides at 90 degree angles
      var distance = circle.y - circle.r - 1;
      var point = new Trig.Point(circle.x, distance);
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde north-east boundary', function () {
      var point = new Trig.Point(
        circle.x + circle.r,
        circle.y - circle.r
      );
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde south-east boundary', function () {
      var point = new Trig.Point(
        circle.x + circle.r,
        circle.y + circle.r
      );
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde north-west boundary', function () {
      var point = new Trig.Point(
        circle.x - circle.r,
        circle.y - circle.r
      );
      chai.assert.notOk(point.intersects(circle));
    });

    it('should not intersect outisde south-west boundary', function () {
      var point = new Trig.Point(
        circle.x - circle.r,
        circle.y + circle.r
      );
      chai.assert.notOk(point.intersects(circle));
    });
  });

  describe('distance', function () {
    var point = new Trig.Point(0, 0);
    it('should match expected distance when sharing axis', function () {
      chai.assert.equal(point.distance(new Trig.Point(-10, 0)), 10);
      chai.assert.equal(point.distance(new Trig.Point(10, 0)), 10);
      chai.assert.equal(point.distance(new Trig.Point(0, -10)), 10);
      chai.assert.equal(point.distance(new Trig.Point(0, 10)), 10);
    });

    it('should match expected distance with no shared axis', function () {
      var dist = 14.142135623730951;
      chai.assert.equal(point.distance(new Trig.Point(-10, -10)), dist);
      chai.assert.equal(point.distance(new Trig.Point(-10, 10)), dist);
      chai.assert.equal(point.distance(new Trig.Point(10, -10)), dist);
      chai.assert.equal(point.distance(new Trig.Point(10, 10)), dist);
    });
  });

  describe('slope', function () {
    var point = new Trig.Point(0, 0);

    it('should match expected slope', function () {
      chai.assert.equal(point.slope(new Trig.Point(10, 20)), 2);
      chai.assert.equal(point.slope(new Trig.Point(10, 10)), 1);
      chai.assert.equal(point.slope(new Trig.Point(10, 5)), 0.5);
      chai.assert.equal(point.slope(new Trig.Point(10, 0)), 0);
    });
  });

  describe('angle', function () {
    var point = new Trig.Point(100, 100);
    it('should match expected angle', function () {
      // on same y-axis, just over a few pixels
      chai.assert.equal(point.angle(new Trig.Point(110, 100)), 0);

      // on opposite side of point
      chai.assert.equal(point.angle(new Trig.Point(90, 100)), 180);

      // directly above point
      chai.assert.equal(point.angle(new Trig.Point(100, 90)), 90);

      // directly below point
      chai.assert.equal(point.angle(new Trig.Point(100, 110)), 270);
    });

    it('should normalize angles above 360', function () {
      chai.assert.equal(Trig.Angle.normalize(720), 0);
      chai.assert.equal(Trig.Angle.normalize(450), 90);
      chai.assert.equal(Trig.Angle.normalize(90), 90);
      chai.assert.equal(Trig.Angle.normalize(-90), 270);
    });
  });

  describe('calc new position along line', function () {
    var point = new Trig.Point(100, 100);
    it('should match expected new position', function () {
      chai.assert.deepEqual(point.calc(new Trig.Point(110, 100), 10), new Trig.Point(110, 100));
      chai.assert.deepEqual(point.calc(new Trig.Point(90, 100), 10), new Trig.Point(90, 100));
      chai.assert.deepEqual(point.calc(new Trig.Point(100, 110), 10), new Trig.Point(100, 110));
      chai.assert.deepEqual(point.calc(new Trig.Point(100, 90), 10), new Trig.Point(100, 90));
    });

    it('should match expected new position (2nd set)', function () {
      chai.assert.deepEqual(point.calc(new Trig.Point(110, 110), 10), new Trig.Point(107.07106781186548, 107.07106781186548));
    });
  });

  describe('circle intersecting segment given angle', function () {
    var circle = new Trig.Circle(100, 100, 50);
    var segments = [120, 120, 120];
    describe('should intersect as expected given angle and segments', function () {
      it('should match first segment (index 0)', function () {
        // test starting boundary
        chai.assert.equal(circle.intersectingSegment(0, segments), 0, 'starting boundary, 0');
        // 360 degrees = 0 degrees, it's like not having a rotation
        chai.assert.equal(circle.intersectingSegment(360, segments), 0, 'starting boundary, 360');

        chai.assert.equal(circle.intersectingSegment(1, segments), 0, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(45, segments), 0, 'inner boundary #2');
        chai.assert.equal(circle.intersectingSegment(120-1, segments), 0, 'inner boundary #3');

        // test ending boundary
        chai.assert.notEqual(circle.intersectingSegment(120, segments), 0, 'ending boundary, 120');
      });

      it('should match second segment (index 1)', function () {
        chai.assert.equal(circle.intersectingSegment(120, segments), 1, 'starting boundary, 120');
        chai.assert.equal(circle.intersectingSegment(120+1, segments), 1, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(240-1, segments), 1, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(240, segments), 1, 'ending boundary, 240');
      });

      it('should match third segment (index 2)', function () {
        chai.assert.equal(circle.intersectingSegment(240, segments), 2, 'starting boundary, 240');
        chai.assert.equal(circle.intersectingSegment(240+1, segments), 2, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(360-1, segments), 2, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(360, segments), 2, 'ending boundary, 360');
      });
    });

    describe('should intersect as expected given angle, segments and offset of one segment (120 degrees)', function () {
      it('should match last segment (index 2)', function () {
        // test starting boundary
        chai.assert.equal(circle.intersectingSegment(0, segments, 120), 2, 'starting boundary, 0');
        // 360 degrees = 0 degrees, it's like not having a rotation
        chai.assert.equal(circle.intersectingSegment(360, segments, 120), 2, 'starting boundary, 360');

        chai.assert.equal(circle.intersectingSegment(1, segments, 120), 2, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(45, segments, 120), 2, 'inner boundary #2');
        chai.assert.equal(circle.intersectingSegment(120-1, segments, 120), 2, 'inner boundary #3');

        // test ending boundary
        chai.assert.notEqual(circle.intersectingSegment(120, segments, 120), 2, 'ending boundary, 120');
      });

      it('should match first segment (index 0)', function () {
        chai.assert.equal(circle.intersectingSegment(120, segments, 120), 0, 'starting boundary, 120');
        chai.assert.equal(circle.intersectingSegment(120+1, segments, 120), 0, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(240-1, segments, 120), 0, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(240, segments, 120), 0, 'ending boundary, 240');
      });

      it('should match second segment (index 1)', function () {
        chai.assert.equal(circle.intersectingSegment(240, segments, 120), 1, 'starting boundary, 240');
        chai.assert.equal(circle.intersectingSegment(240+1, segments, 120), 1, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(360-1, segments, 120), 1, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(360, segments, 120), 1, 'ending boundary, 360');
      });
    });

    describe('should intersect as expected given angle, segments and offset of two segments (240 degrees)', function () {
      it('should match second segment (index 1)', function () {
        // test starting boundary
        chai.assert.equal(circle.intersectingSegment(0, segments, 240), 1, 'starting boundary, 0');
        // 360 degrees = 0 degrees, it's like not having a rotation
        chai.assert.equal(circle.intersectingSegment(360, segments, 240), 1, 'starting boundary, 360');

        chai.assert.equal(circle.intersectingSegment(1, segments, 240), 1, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(45, segments, 240), 1, 'inner boundary #2');
        chai.assert.equal(circle.intersectingSegment(120-1, segments, 240), 1, 'inner boundary #3');

        // test ending boundary
        chai.assert.notEqual(circle.intersectingSegment(120, segments, 240), 1, 'ending boundary, 120');
      });

      it('should match third segment (index 2)', function () {
        chai.assert.equal(circle.intersectingSegment(120, segments, 240), 2, 'starting boundary, 120');
        chai.assert.equal(circle.intersectingSegment(120+1, segments, 240), 2, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(240-1, segments, 240), 2, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(240, segments, 240), 2, 'ending boundary, 240');
      });

      it('should match first segment (index 0)', function () {
        chai.assert.equal(circle.intersectingSegment(240, segments, 240), 0, 'starting boundary, 240');
        chai.assert.equal(circle.intersectingSegment(240+1, segments, 240), 0, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(360-1, segments, 240), 0, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(360, segments, 240), 0, 'ending boundary, 360');
      });
    });

    describe('should intersect as expected given angle, segments and offset of 270 degrees', function () {
      it('should match second segment (index 1)', function () {
        // test starting boundary
        chai.assert.equal(circle.intersectingSegment(0, segments, 358), 0, 'starting boundary, 0');
        // 360 degrees = 0 degrees, it's like not having a rotation
        chai.assert.equal(circle.intersectingSegment(360, segments, 358), 0, 'starting boundary, 360');
        chai.assert.equal(circle.intersectingSegment(358, segments, 358), 0, 'starting boundary, 358');

        chai.assert.equal(circle.intersectingSegment(1, segments, 358), 0, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(45, segments, 358), 0, 'inner boundary #2');

        // ending boundary is now no longer 120, because we are not perfectly rotated
        chai.assert.notEqual(circle.intersectingSegment(120-2, segments, 358), 0, 'ending boundary #1');
        chai.assert.notEqual(circle.intersectingSegment(120, segments, 358), 0, 'ending boundary #2');
      });

      it('should match third segment (index 2)', function () {
        chai.assert.equal(circle.intersectingSegment(120-2, segments, 358), 1, 'starting boundary');
        chai.assert.equal(circle.intersectingSegment(120, segments, 358), 1, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(120+1, segments, 358), 1, 'inner boundary #2');
        chai.assert.notEqual(circle.intersectingSegment(240-2, segments, 358), 1, 'ending boundary #1');
        chai.assert.notEqual(circle.intersectingSegment(240, segments, 358), 1, 'ending boundary #2');
      });

      it('should match first segment (index 0)', function () {
        chai.assert.equal(circle.intersectingSegment(240-2, segments, 358), 2, 'starting boundary');
        chai.assert.equal(circle.intersectingSegment(240, segments, 358), 2, 'inner boundary #1');
        chai.assert.equal(circle.intersectingSegment(240+1, segments, 358), 2, 'inner boundary #2');
        chai.assert.equal(circle.intersectingSegment(360-3, segments, 358), 2, 'inner boundary #3');
        chai.assert.notEqual(circle.intersectingSegment(360-2, segments, 358), 2, 'ending boundary');
      });
    });
  });

  describe('randomness', function () {
    it('random should return a number given max and min', function () {
      var r = Trig.random(1, 3);
      chai.assert.ok(r >= 1 && r <= 3);

      r = Trig.random(-10, -5);
      console.log('r', r);
      chai.assert.ok(r >= -10 && r <= -5);
    });
  })
});