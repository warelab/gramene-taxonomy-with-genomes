'use strict';

var jasminePit = require('jasmine-pit');
var _ = require('lodash');
var Q = require('q');

jasminePit.install(global);
require('jasmine-expect');

var binFunctions = ['results', 'binCount', 'setResults', 'species'];

describe('Taxonomy with Binned Genomes', function () {
  var gtaxonomy = require('../../index');

  pit('should get the taxonomy with new function to specify bin type', function () {
    return gtaxonomy.get(true).then(function (taxonomy) {
      expect(taxonomy.setBinType).toBeFunction();

      binFunctions.map(function (fnName) {
        expect(taxonomy[fnName]).toBeUndefined();
      });
    });
  });

  pit('should allow a bin type to be specified', function () {
    return gtaxonomy.get(true).then(function (taxonomy) {
      taxonomy.setBinType('fixed', 200);

      binFunctions.map(function (fnName) {
        expect(taxonomy[fnName]).toBeFunction(fnName + ' should be a function');
      });

      expect(taxonomy.results()).toBeUndefined();
      expect(taxonomy.binCount()).toEqual(6009);
      expect(taxonomy.species().length).toEqual(39);

      // no results yet, so...
      expect(taxonomy.speciesWithResults().length).toEqual(0);
    });
  });

  pit('setBinType should return a boolean as to whether the bin config changed', function() {
    return gtaxonomy.get(true).then(function (taxonomy) {
      expect(taxonomy.setBinType('fixed', 200)).toEqual(true);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(200);

      expect(taxonomy.setBinType('fixed', 200)).toEqual(false);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(200);

      expect(taxonomy.setBinType('fixed', 1000)).toEqual(true);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(1000);

      expect(taxonomy.setBinType('fixed', 200)).toEqual(true);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(200);
    });
  });

  pit('setBinType to unrecognized should clear bins', function() {
    return gtaxonomy.get(true).then(function (taxonomy) {
      expect(taxonomy.setBinType('fixed', 200)).toEqual(true);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(200);

      expect(taxonomy.setBinType()).toEqual(true);
      expect(taxonomy.binParams.method).toBeUndefined();
      expect(taxonomy.binParams.param).toBeUndefined();

      expect(taxonomy.setBinType()).toEqual(false);
      expect(taxonomy.binParams.method).toBeUndefined();
      expect(taxonomy.binParams.param).toBeUndefined();

      expect(taxonomy.setBinType('i do not exist')).toEqual(false);
      expect(taxonomy.binParams.method).toBeUndefined();
      expect(taxonomy.binParams.param).toBeUndefined();

      expect(function() { taxonomy.setBinType('fixed', 'i do not exist') })
        .toThrow('binsPerGenome must be numeric: i do not exist');
    });
  });

  pit('removeBins should also clear bins', function() {
    return gtaxonomy.get(true).then(function (taxonomy) {
      expect(taxonomy.setBinType('fixed', 200)).toEqual(true);
      expect(taxonomy.binParams.method).toEqual('fixed');
      expect(taxonomy.binParams.param).toEqual(200);

      expect(taxonomy.removeBins()).toEqual(true);
      expect(taxonomy.binParams.method).toBeUndefined();
      expect(taxonomy.binParams.param).toBeUndefined();

      expect(taxonomy.removeBins()).toEqual(false);
      expect(taxonomy.binParams.method).toBeUndefined();
      expect(taxonomy.binParams.param).toBeUndefined();
    });
  });

  pit('should allow search results to be added', function () {
    var testSearch = require('gramene-search-client').client._testSearch;

    return Q.all([
      gtaxonomy.get(true),
      testSearch('binned')
    ]).spread(function (taxonomy, results) {
        taxonomy.setBinType('fixed', 200);
        taxonomy.setResults(results.fixed_200_bin);

        expect(taxonomy.results()).toBeDefined();
        expect(taxonomy.results().count).toEqual(2147);

        expect(taxonomy.species().length).toEqual(39);
        expect(taxonomy.speciesWithResults().length).toEqual(37);
      }
    );
  });
});