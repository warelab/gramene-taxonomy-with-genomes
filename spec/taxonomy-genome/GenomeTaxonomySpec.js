'use strict';

var jasminePit = require('jasmine-pit');
var _ = require('lodash');

jasminePit.install(global);
require('jasmine-expect');

var binFunctions = ['results', 'binCount', 'setResults', 'species'];

describe('Taxonomy with Binned Genomes', function() {
  var gtaxonomy = require('../../index');

  pit('should get the taxonomy with new function to specify bin type', function() {
    return gtaxonomy.get(true).then(function(taxonomy) {
      expect(taxonomy.setBinType).toBeFunction();

      binFunctions.map(function(fnName) {
        expect(taxonomy[fnName]).toBeUndefined();
      })
    });
  });

  pit('should allow a bin type to be specified', function() {
    return gtaxonomy.get(true).then(function(taxonomy) {
      taxonomy.setBinType('fixed', 200);

      binFunctions.map(function(fnName) {
        expect(taxonomy[fnName]).toBeFunction(fnName + ' should be a function');
      });

    });
  });
});