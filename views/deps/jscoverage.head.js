(function (window) {
  'use strict';

  function BranchData() {
    this.position = -1;
    this.nodeLength = -1;
    this.src = null;
    this.evalFalse = 0;
    this.evalTrue = 0;

    this.init = function (position, nodeLength, src) {
      this.position = position;
      this.nodeLength = nodeLength;
      this.src = src;
      return this;
    };

    this.ranCondition = function (result) {
      if (result) {
        this.evalTrue++;
      } else {
        this.evalFalse++;
      }
    };

    this.pathsCovered = function () {
      var paths = 0;
      if (this.evalTrue > 0) {
        paths++;
      }
      if (this.evalFalse > 0) {
        paths++;
      }
      return paths;
    };

    this.covered = function () {
      return this.evalTrue > 0 && this.evalFalse > 0;
    };
  }

  var toJson = BranchData.prototype.toJSON = function () {
    return {
      'position': this.position,
      'nodeLength': this.nodeLength,
      'src': this.src,
      'evalFalse': this.evalFalse,
      'evalTrue': this.evalTrue
    };
  };

  BranchData.prototype.message = function () {
    if (this.evalTrue === 0 && this.evalFalse === 0) {
      return 'Condition never evaluated         :\t' + this.src;
    } else if (this.evalTrue === 0) {
      return 'Condition never evaluated to true :\t' + this.src;
    } else if (this.evalFalse === 0) {
      return 'Condition never evaluated to false:\t' + this.src;
    } else {
      return 'Condition covered';
    }
  };

  var fromJson = BranchData.fromJson = function (jsonString) {
    if (typeof jsonString !== 'string') {
      return BranchData.fromJsonObject(jsonString);
    }

    var json = JSON.parse(jsonString);
    var branchData = new BranchData();
    branchData.init(json.position, json.nodeLength, json.src);
    branchData.evalFalse = json.evalFalse;
    branchData.evalTrue = json.evalTrue;
    return branchData;
  };

  BranchData.fromJsonObject = function (json) {
    var branchData = new BranchData();
    branchData.init(json.position, json.nodeLength, json.src);
    branchData.evalFalse = json.evalFalse;
    branchData.evalTrue = json.evalTrue;
    return branchData;
  };

  window.buildBranchMessage = function buildBranchMessage(conditions) {
    var message = 'The following was not covered:';
    for (var i = 0; i < conditions.length; i++) {
      if (conditions[i] !== undefined && conditions[i] !== null && !conditions[i].covered())
        message += '\n- '+ conditions[i].message();
    }
    return message;
  };

  function saveCoverageData(data) {
    // convert branch data to regular object to be JSON encoded
    for (var file in data) {
      if (data[file].branchData) {
        for (var branchId in data[file].branchData) {
          if (data[file].branchData.hasOwnProperty(branchId)) {
            for (var i = 0, l = data[file].branchData[branchId].length; i < l; i++) {
              if (!data[file].branchData[branchId][i]) {
                continue;
              }

              // convert the BranchData object to a regular object
              // we need use it like this because
              data[file].branchData[branchId][i] = toJson.call(data[file].branchData[branchId][i]);
            }
          }
        }
      }
    }

    // now simply JSON.stringify the data
    return JSON.stringify(data);
  }

  function restoreCoverageData(jsonString) {
    var data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

    // confirm the JSON.parse worked properly
    if (!data) {
      return;
    }

    // convert branch data to BranchData objects
    for (var file in data) {
      if (data[file].branchData) {
        for (var branchId in data[file].branchData) {
          if (data[file].branchData.hasOwnProperty(branchId)) {
            for (var i = 0, l = data[file].branchData[branchId].length; i < l; i++) {
              if (!data[file].branchData[branchId][i]) {
                continue;
              }

              // convert the BranchData object to a regular object
              // we need use it like this because
              data[file].branchData[branchId][i] = fromJson(data[file].branchData[branchId][i]);
            }
          }
        }
      }
    }

    return data;
  }

  // load from and save to window.localStorage when available
  if (window.useLocalStorage && window.localStorage) {
    if ('jscover' in window.localStorage) {
      window._$jscoverage = restoreCoverageData(window.localStorage.jscover);
    }

    window.addEventListener('beforeunload', function () {
      if (window._$jscoverage) {
        window.localStorage.jscover = saveCoverageData(window._$jscoverage);
      }
    }, false);
  }

  window.saveCoverageData = saveCoverageData;
  window.restoreCoverageData = restoreCoverageData;
})(this);