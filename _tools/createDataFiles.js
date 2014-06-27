#!/usr/bin/env node

/* Writes files for JSON representation of all individuals on tracks with a given individual */

var fs = require("graceful-fs");

var sourceDataDir = __dirname + "/node_modules/music-routes-data/data";
var individuals = require(sourceDataDir + "/individuals.json");
var individualIds = individuals.map(function(elem) { return elem._id; });
var individual_track = require(sourceDataDir + "/individual_track.json");

var getName = function (id) {
  return individuals.filter(function(elem) {
    return elem._id === id;
  })[0].names[0];
};

var generateJson = function (individualId) {
  console.log("Generating JSON data for individual with ID of " + individualId + "...");

  var sourceLabel = getName(individualId);

  var tracksWithIndividual = individual_track.filter(function (elem) {
    return elem.individual_id === individualId;
  }).map(function (elem) {
    return elem.track_id;
  });

  var seen = [];
  var connectedIndividuals = individual_track.filter(function (elem) {
    if (seen.indexOf(elem.individual_id) != -1) {
      return false;
    }

    if (tracksWithIndividual.indexOf(elem.track_id) > -1) {
      if (elem.individual_id != individualId) {
        seen.push(elem.individual_id);
        return true;
      }
    }

    return false;
  }).map(function (elem) {
    return {name: getName(elem.individual_id), targetId: elem.individual_id};
  });

  var file = individualId + ".json";
  var formattedOutput = JSON.stringify({source: sourceLabel, targets: connectedIndividuals}, null, 2);

  fs.writeFile(__dirname + "/../data/" + file, formattedOutput,
    function (err) {
      if (err) throw err;
      console.log("Wrote JSON file for individual with ID of " + individualId);
    }
  );
};

individualIds.forEach(function (individualId) {
  generateJson(individualId);
});