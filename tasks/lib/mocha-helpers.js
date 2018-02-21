/**
 * Some helper functions when working with mocha
 */

'use strict';

/**
 * Take a collection of stats objects and reduce them
 *
 * @param stats {Array} Array of mocha test stats
 */

module.exports.reduceStats = function (s) {
  var initial = {
    passes: 0,
    failures: 0,
    tests: 0,
    duration: 0
  };

  // console.log(testStats);
  var total = s.reduce(function (prev, stats) {
    prev.passes    += stats.passes;
    prev.failures  += stats.failures;
    prev.tests     += stats.tests;
    prev.duration  += (new Date(stats.end) - new Date(stats.start));
    return prev;
  }, initial);

  total.duration = formatMs(total.duration);

  return total;
};

var formatMs = function(ms) {
  return (Math.ceil(ms * 100) / 100000).toFixed(2);
};
