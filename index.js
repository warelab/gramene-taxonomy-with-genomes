'use strict';

var binsPromise = require('gramene-bins-client').binsPromise;
var treesPromise = require('gramene-trees-client').promise;
var Q = require('q');

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
  taxonomy.binCount = function () { return genomes.binCount(); };
  taxonomy.setResults = function() { return genomes.setResults.apply(genomes, arguments); };

  taxonomy.species = function () {
    return taxonomy.all(function (node) {
      return node.model.genome;
    }).map(function (node) {
      return node.model;
    });
  }
}

function addGeneratorToTaxonomy(binsGenerator, taxonomy) {
  taxonomy.setBinType = function(methodName, param) {
    var binFn = binsGenerator[methodName + 'BinMapper'];
    var genomes = binFn(param).binnedGenomes();

    addGenomesToTaxonomy(taxonomy, genomes);
  };

  return taxonomy;
}

module.exports = {
  get: function(local) {
    return Q.all([
      binsPromise.get(local),
      treesPromise.get(local)
    ]).spread(addGeneratorToTaxonomy);
  }
};
