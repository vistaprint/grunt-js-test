(function (root, factory) {
  if (typeof exports === 'object') {
    // Node.
    module.exports = factory();
  } else if (typeof require === 'function') {
    define([], factory);
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals (root is window)
    root.Trig = factory();
  }
}(this, function () {

  function Point(x, y) {
    this.x = x === undefined ? 0 : x;
    this.y = y === undefined ? 0 : y;
  }

  // this will be cpu-heavy, since calculating the square root is heavy
  // d = Math.sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
  Point.prototype.distance = function (point) {
    if (this.x === point.x) {
      return Math.abs(this.y - point.y);
    }

    if (this.y === point.y) {
      return Math.abs(this.x - point.x);
    }

    // var dx = Math.abs(point.x - this.x);
    // var dy = Math.abs(point.y - this.y);

    var dx = Math.pow(point.x - this.x, 2);
    var dy = Math.pow(point.y - this.y, 2);

    return Math.sqrt(dx + dy);
  };

  // determine if point intersects with given object
  Point.prototype.intersects = function (object) {
    return pointIntersectsCircle(this, object);
  };

  // provide the slope between this point and given point
  Point.prototype.slope = function (point) {
    return (point.y - this.y) / (point.x - this.x);
  };

  // calculate the angle between two points
  // http://stackoverflow.com/questions/7586063/how-to-calculate-the-angle-between-two-points-relative-to-the-horizontal-axis
  Point.prototype.angle = function (point) {
    if (this.y === point.y) {
      if (point.x >= this.x) {
        return 0;
      } else {
        return 180;
      }
    }

    var dx = point.x - this.x;
    var dy = this.y - point.y;
    var degrees = radiansToDegrees(Math.atan2(dy, dx));

    if (degrees < 0) {
      return degrees + 360;
    } else {
      return degrees;
    }
  };

  // calculate new point given a distance along line given by point
  Point.prototype.calc = function (point, distance) {
    var vx = point.x - this.x;
    var vy = point.y - this.y;

    // length of line
    var mag = this.distance(point);

    // convert vector to length units
    vx /= mag;
    vy /= mag;

    return new Point(
      this.x + vx * distance,
      this.y + vy * distance
    );
  };

  function Circle(x, y, r) {
    // center points of circle
    this.x = x;
    this.y = y;

    // radius
    this.r = r;
  }

  // extend Circle from Point
  Circle.prototype = new Point(0, 0);

  Circle.prototype.intersects = function (point) {
    return pointIntersectsCircle(point, this);
  };

  Circle.prototype.intersectingSegment = function (angle, segments, offset) {
    angle = reduceDegrees(angle - (offset || 0));
    var sumTo = 0;

    for (var i = 0, l = segments.length; l > i; i++) {
      if (sumTo <= angle && sumTo + segments[i] > angle) {
        return i;
      }

      sumTo += segments[i];
    }

    return null;
  };

  // utility method, returns true if given point intersects given circle
  // determine if a given point it within the bounds of given circle
  // first determine the distance between the given point and center of the circle
  // then ensure the distance is less than the radius.
  function pointIntersectsCircle(point, circle) {
    var dx = Math.abs(point.x - circle.x);
    var dy = Math.abs(point.y - circle.y);

    // imagine a square drawn around it such that it's sides are tangents to this circle
    // if the deltas are larger than the radius, then point is clearly outside the circle
    if (dx > circle.r || dy > circle.r) {
      return false;
    }

    // imagine a square diamond drawn inside this circle such that it's vertices touch this circle:
    if (dx + dy <= circle.r) {
      return true;
    }

    // now that we've covered most the space around and in the circle, we do a true Pythagoras
    // test to check if the point is within the radius of the circle at all angles

    // this is a lower-cpu cost way to test most the circle, but is not 100% accurate
    if (dx * 2 + dy * 2 <= circle.r * 2) {
      return true;
    }

    // this is the true circle test, we calculate the distance between the points
    // then ensure the distance is less than the radius
    // We square the radius of the circle to avoid having to sqrt the sum of dx^2+dy^2
    return Math.pow(dx, 2) + Math.pow(dy, 2) <= Math.pow(circle.r, 2);
  }

  // helper functions
  var Angle = {
    normalize: function (angle) {
      if (angle < 0) {
        return angle + 360;
      }

      else if (angle > 360) {
        return angle - Math.floor(angle / 360) * 360;
      }

      return angle;
    }
  };

  function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  function reduceDegrees(degrees) {
    degrees = degrees % 360;

    if (degrees < 0) {
      degrees += 360;
    }

    return degrees;
  }

  // get a random number between the given min and max
  function random(min, max) {
    var range = max - min + 1;

    if (window && window.crypto && window.crypto.getRandomValues) {
      var maxRange, byteArray;

      // decide which typed array to use depending on the max value
      if (max <= 256) {
        maxRange = 256; // Math.pow(2, 8)
        byteArray = new Uint8Array(1);
      } else if (max > 256 && max <= 65536) {
        maxRange = 65536; // Math.pow(2, 16)
        byteArray = new Uint16Array(1);
      } else if (max > 65536) {
        maxRange = 4294967296; // Math.pow(2, 32)
        byteArray = new Uint32Array(1);
      }

      // Fill byteArray with 1 random number
      window.crypto.getRandomValues(byteArray);

      // If outside of range, get another
      if (max !== maxRange && byteArray[0] >= Math.floor(maxRange / range) * range) {
        return random(min, max);
      }

      return min + (byteArray[0] % range);
    }
    // no support for window.crypto, use Math.random
    else {
      return Math.floor(Math.random() * range) + min;
    }
  }

  return {
    // classes
    Point: Point,
    Circle: Circle,
    Angle: Angle,

    // utility methods
    degreesToRadians: degreesToRadians,
    radiansToDegrees: radiansToDegrees,
    reduceDegrees: reduceDegrees,

    // random methods
    random: random,
    randomness: function (object) {
      var r = random(0, 100);
      var counter = 0;
      var chance;

      for (chance in object) {
        if (object.hasOwnProperty[chance]) {
          if (r >= counter && r < counter + chance) {
            return object[chance];
          }

          counter += chance;
        }
      }

      return r === 100 ? object[chance] : null;
    },

    // unit testing access
    _private: {
      pointIntersectsCircle: pointIntersectsCircle
    }
  };
}));