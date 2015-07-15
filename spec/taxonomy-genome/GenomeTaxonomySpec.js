'use strict';

var jasminePit = require('jasmine-pit');
var _ = require('lodash');
var Q = require('q');

jasminePit.install(global);
require('jasmine-expect');

var binFunctions = ['stats', 'results', 'setResults', 'species'];

describe('Taxonomy with Binned Genomes', function () {
  var gtaxonomy, gtaxPromise;

  beforeEach(function() {
    gtaxonomy = require('../../index');
    gtaxPromise = gtaxonomy.get(true);
  });

  pit('should get the taxonomy with new function to specify bin type', function () {
    return gtaxPromise.then(function (taxonomy) {
      expect(taxonomy.setBinType).toBeFunction();

      binFunctions.map(function (fnName) {
        expect(taxonomy[fnName]).toBeUndefined();
      });
    });
  });

  pit('should allow a bin type to be specified', function () {
    return gtaxPromise.then(function (taxonomy) {
      var arabidopsis = taxonomy.indices.name['Arabidopsis'];

      taxonomy.setBinType('fixed', 200);

      binFunctions.map(function (fnName) {
        expect(taxonomy[fnName]).toBeFunction(fnName + ' should be a function');
      });

      expect(taxonomy.results()).toBeUndefined();
      expect(taxonomy.stats().bins).toEqual(6009);
      expect(taxonomy.stats().genomes).toEqual(39);

      expect(arabidopsis.results()).toBeUndefined();
      expect(arabidopsis.stats().bins).toEqual(400);
      expect(arabidopsis.stats().genomes).toEqual(2);
      expect(taxonomy.species().length).toEqual(taxonomy.stats().genomes);

      // no results yet, so...
      expect(taxonomy.speciesWithResults().length).toEqual(0);
    });
  });

  pit('setBinType should return a boolean as to whether the bin config changed', function() {
    return gtaxPromise.then(function (taxonomy) {
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
    return gtaxPromise.then(function (taxonomy) {
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
    return gtaxPromise.then(function (taxonomy) {
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
      gtaxPromise,
      testSearch('binned')
    ]).spread(function (taxonomy, exampleSearchResults) {
        var arabidopsis = taxonomy.indices.name['Arabidopsis'];

        taxonomy.setBinType('fixed', 200);
        taxonomy.setResults(exampleSearchResults.fixed_200_bin);

        expect(taxonomy.results).toBeDefined();
        expect(taxonomy.results().count).toEqual(2147);
        expect(taxonomy.results().bins).toEqual(1103);

        expect(taxonomy.stats().genomes).toEqual(39);
        expect(taxonomy.species().length).toEqual(taxonomy.stats().genomes);
        expect(taxonomy.speciesWithResults().length).toEqual(37);

        expect(arabidopsis.results).toBeDefined();
        expect(arabidopsis.results().count).toEqual(99);
        expect(arabidopsis.results().bins).toEqual(73);

        expect(arabidopsis.stats().genomes).toEqual(2);
        expect(arabidopsis.species().length).toEqual(arabidopsis.stats().genomes);
        expect(arabidopsis.speciesWithResults().length).toEqual(2);
      }
    );
  });

  pit('should be able to get results for each bin on a genome', function() {
    var testSearch = require('gramene-search-client').client._testSearch;

    return Q.all([
      gtaxPromise,
      testSearch('binned')
    ]).spread(function (taxonomy, exampleSearchResults) {
        var nodeModel;

        taxonomy.setBinType('fixed', 200);
        taxonomy.setResults(exampleSearchResults.fixed_200_bin);

        nodeModel = taxonomy.speciesWithResults()[0];
        nodeModel.genome.eachRegion(function(region) {
          return region.eachBin(function(bin) {
            expect(bin.results).toBeDefined();
            expect(bin.results.count).toBeNumber();
          });
        });
      }
    );
  });

  pit('species should have name and genome', function() {
    return gtaxPromise.then(function(taxonomy) {
      taxonomy.setBinType('fixed', 200);
      taxonomy.species().map(function(sp) {
        expect(sp.name).toBeNonEmptyString();
        expect(sp.genome).toBeNonEmptyObject();
      });
    });
  });

  pit('should roll up stats from species to higher taxonomy nodes', function () {
    var testSearch = require('gramene-search-client').client._testSearch;

    return Q.all([
      gtaxPromise,
      testSearch('binned')
    ]).spread(function (taxonomy, exampleSearchResults) {
      var arabidopsis;

      // given
      taxonomy.setBinType('fixed', 200);
      taxonomy.setResults(exampleSearchResults.fixed_200_bin);
      arabidopsis = taxonomy.indices.name['Arabidopsis'];

      // then
      expect(taxonomy.stats().genes).toEqual(1666975);
      expect(taxonomy.stats().genomes).toEqual(39);
      expect(taxonomy.stats().bins).toEqual(6009);

      expect(taxonomy.results().count).toEqual(2147);
      expect(taxonomy.results().bins).toEqual(1103);

      expect(arabidopsis.stats().genes).toEqual(66269);
      expect(arabidopsis.stats().genomes).toEqual(2);
      expect(arabidopsis.stats().bins).toEqual(400);

      expect(arabidopsis.results().count).toEqual(99);
      expect(arabidopsis.results().bins).toEqual(73);

    });
  });
});