'use strict';

var binsPromise = require('gramene-bins-client').binsPromise;
var treesPromise = require('gramene-trees-client').promise;
var Q = require('q');
var _ = require('lodash');

function addGenomesToTaxonomy(taxonomy, genomes) {
  taxonomy.leafNodes().forEach(function (speciesNode) {
    var species = speciesNode.model,
      taxonId = species.id,
      genome = genomes.get(taxonId);

    if (!genome) {
      console.warn('No genome found for', species);
    }

    species.genome = genome;
  });

  taxonomy.results = function () { return genomes.results; };
  taxonomy.binCount = genomes.binCount.bind(genomes);
  taxonomy.setResults = genomes.setResults.bind(genomes);

  function getNodesAndReturnModel(predicate) {
    return function () {
      return taxonomy.all(predicate)
        .map(function (node) {
          return node.model;
        });
    }
  }

  taxonomy.species = getNodesAndReturnModel(function (node) {
    return node.model.genome;
  });

  taxonomy.speciesWithResults = getNodesAndReturnModel(function (node) {
    return node.model.genome &&
      node.model.genome.results &&
      node.model.genome.results.count;
  });
}

function removeGenomesFromTaxonomy(taxonomy) {
  taxonomy.leafNodes().forEach(function (speciesNode) {
    delete speciesNode.model.genome;
  });

  ['results', 'binCount', 'setResults', 'species'].map(function (fnName) {
    delete taxonomy[fnName];
  })
}

function addGeneratorToTaxonomy(binsGenerator, taxonomy) {
  taxonomy.binParams = {};
  taxonomy.setBinType = function (methodName, param) {

    var newParams = methodName ? {method: methodName, param: param} : {};

    if (_.isEqual(this.binParams, newParams)) {
      return false;
    }

    var binFn = binsGenerator[methodName + 'BinMapper'];

    if (!binFn) {
      removeGenomesFromTaxonomy(taxonomy);
      if (_.isEqual(this.binParams, {})) {
        return false;
      }

      this.binParams = {};
      return true;
    }

    var genomes = binFn(param).binnedGenomes();

    this.binParams = {
      method: methodName,
      param: param
    };

    addGenomesToTaxonomy(taxonomy, genomes);

    return true;
  };
  taxonomy.removeBins = function () { return taxonomy.setBinType() };

  return taxonomy;
}

module.exports = {
  get: function (local) {
    return Q.all([
      binsPromise.get(local),
      treesPromise.get(local)
    ]).spread(addGeneratorToTaxonomy);
  }
};
