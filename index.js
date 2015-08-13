'use strict';

var binsPromise = require('gramene-bins-client').binsPromise;
var treesPromise = require('gramene-trees-client').promise;
var Q = require('q');
var _ = require('lodash');

// given two objects that have the same keys and whose values are all integers
// return a new object that sums them together. If either object is null, return
// the other one.
function addCounts(o1, o2) {
  var result;
  if (o1 && o2) {
    result = _.merge(o1, o2, function (a, b) {
      return a + b;
    });
  }
  else if (o1) {
    result = o1;
  }
  else {
    result = o2;
  }
  return result;
}

function addGenomesToTaxonomy(taxonomy, genomes) {
  var taxonomyPrototype = Object.getPrototypeOf(taxonomy);
  taxonomy.leafNodes().forEach(function (speciesNode) {
    var species = speciesNode.model,
      genome = genomes.get(species.id);

    if (!genome) {
      console.warn('No genome found for', species);
    }

    species.genome = genome;
  });

  function calcStatsForTaxonomyNode(node) {
    var statsFromChildren,
      statsFromGenome;

    if (node.model.genome) {
      statsFromGenome = {
        genomes: 1,
        genes: node.model.geneCount,
        bins: node.model.genome.nbins
      };
    }

    if (node.children && node.children.length) {
      statsFromChildren = _.reduce(node.children, function (total, childNode) {
        return addCounts(total, calcStatsForTaxonomyNode(childNode));
      }, {genomes: 0, genes: 0, bins: 0});
    }

    node.model.stats = addCounts(statsFromGenome, statsFromChildren);

    return node.model.stats;
  }

  calcStatsForTaxonomyNode(taxonomy);

  taxonomyPrototype.genomes = function () {
    return this.leafNodes().map(function (species) {
      return species.model.genome;
    });
  };

  taxonomyPrototype.results = function () { return this.model.results; };
  taxonomyPrototype.stats = function () { return this.model.stats; };
  taxonomyPrototype.globalResultSetStats = function () { return genomes.stats };

  taxonomy.setResults = function () {
    var maxProportion = 0, maxProportionNode;
    genomes.setResults.apply(genomes, arguments);

    function updateCounts(node) {
      var countFromChildren={count: 0, bins: 0},
        countFromGenome={count: 0, bins: 0},
        resultCount, geneCount, proportion;

      if (node.model.genome) {
        countFromGenome = node.model.genome.results;
      }

      if (node.children && node.children.length) {
        countFromChildren = _.reduce(node.children, function (total, childNode) {
          return addCounts(total, updateCounts(childNode));
        }, {count: 0, bins: 0});
      }

      node.model.results = addCounts(countFromGenome, countFromChildren);

      resultCount = node.model.results.count;
      geneCount = node.model.stats.genes;
      proportion = geneCount ? (resultCount / geneCount) : 0;
      node.model.results.proportion = proportion;
      if(proportion > maxProportion) {
        maxProportion = proportion;
        maxProportionNode = node;
      }

      return node.model.results;
    }

    updateCounts(taxonomy);
    genomes.stats.maxProportion = maxProportion;
    genomes.stats.maxProportionNode = maxProportionNode;
  };

  function getNodesAndReturnModel(self, predicate) {
    return function () {
      return this.all(predicate)
        .map(function (node) {
          return node.model;
        });
    }.call(self);
  }

  taxonomyPrototype.species = function () {
    return getNodesAndReturnModel(this, function (node) {
      return node.model.genome;
    });
  };

  taxonomyPrototype.speciesWithResults = function () {
    return getNodesAndReturnModel(this, function (node) {
      return node.model.genome &&
        node.model.genome.results &&
        node.model.genome.results.count;
    });
  }
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
