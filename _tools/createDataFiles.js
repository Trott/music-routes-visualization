#!/usr/bin/env node

/* Writes files for JSON representation of all individuals on tracks with a given individual */

const EventEmitter = require('events').EventEmitter
const argv = require('minimist')(process.argv.slice(2))
const fs = require('graceful-fs')
const path = require('path')

var logger = new EventEmitter()

if (!argv.q) {
  logger.on('log', function (msg) {
    console.log(msg)
  })
}

var sourceDataDir = path.join(__dirname, '/../node_modules/music-routes-data/data')
var individuals = require(sourceDataDir + '/individuals.json')
var individualIds = individuals.map(function (elem) { return elem._id })
var individualTrack = require(sourceDataDir + '/individual_track.json')
var tracks = require(sourceDataDir + '/tracks.json')
var releases = require(sourceDataDir + '/releases.json')
var trackRelease = require(sourceDataDir + '/track_release.json')
var artists = require(sourceDataDir + '/artists.json')
var artistTrack = require(sourceDataDir + '/artist_track.json')

var getName = function (id) {
  return individuals.filter(function (elem) {
    return elem._id === id
  })[0].names[0]
}

var generateJson = function (individualId) {
  logger.emit('log', 'Generating JSON data for individual with ID of ' + individualId + '...')

  var sourceLabel = getName(individualId)

  var tracksWithIndividual = individualTrack.filter(function (elem) {
    return elem.individual_id === individualId
  }).map(function (elem) {
    return elem.track_id
  })

  var tracksDetailsForIndividual = tracks.filter(function (elem) {
    return tracksWithIndividual.indexOf(elem._id) > -1
  })

  tracksDetailsForIndividual.forEach(function (track) {
    var trackReleaseIds = trackRelease.filter(function (relation) {
      return relation.track_id === track._id
    }).map(function (elem) { return elem.release_id })

    track.releases = releases.filter(function (release) {
      return trackReleaseIds.indexOf(release._id) > -1
    })

    var trackArtistIds = artistTrack.filter(function (relation) {
      return relation.track_id === track._id
    }).map(function (elem) { return elem.artist_id })

    track.artists = artists.filter(function (artist) {
      return trackArtistIds.indexOf(artist._id) > -1
    })
  })

  var trackCounts = {}
  var trackArrays = {}
  var connectedIndividuals = individualTrack.filter(function (elem) {
    if (tracksWithIndividual.indexOf(elem.track_id) > -1) {
      if (elem.individual_id !== individualId) {
        if (trackCounts[elem.individual_id]) {
          trackCounts[elem.individual_id]++
          trackArrays[elem.individual_id].push(elem.track_id)
          return false
        }
        trackCounts[elem.individual_id] = 1
        trackArrays[elem.individual_id] = [elem.track_id]
        return true
      }
    }

    return false
  }).map(function (elem) {
    return {
      name: getName(elem.individual_id),
      targetId: elem.individual_id,
      trackCount: trackCounts[elem.individual_id],
      tracks: trackArrays[elem.individual_id]
    }
  })

  var file = individualId + '.json'
  var formattedOutput = JSON.stringify({
    source: sourceLabel,
    trackCount: tracksWithIndividual.length,
    tracks: tracksDetailsForIndividual,
    targets: connectedIndividuals
  }, null, 2)

  fs.writeFile(path.join(__dirname, '../data', file), formattedOutput,
    function (err) {
      if (err) {
        throw err
      }
      logger.emit('log', 'Wrote JSON file for individual with ID of ' + individualId)
    }
  )
}

individualIds.forEach(function (individualId) {
  generateJson(individualId)
})
