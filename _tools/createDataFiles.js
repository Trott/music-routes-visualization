#!/usr/bin/env node

/* Writes files for JSON representation of all individuals on tracks with a given individual */

const EventEmitter = require('events').EventEmitter
const argv = require('minimist')(process.argv.slice(2))
const fs = require('graceful-fs')
const path = require('path')

const logger = new EventEmitter()

if (!argv.q) {
  logger.on('log', function (msg) {
    console.log(msg)
  })
}

const sourceDataDir = path.join(__dirname, '/../node_modules/music-routes-data/data')
const individuals = require(sourceDataDir + '/individuals.json')
const individualIds = individuals.map(function (elem) { return elem._id })
const individualTrack = require(sourceDataDir + '/individual_track.json')
const tracks = require(sourceDataDir + '/tracks.json')
const releases = require(sourceDataDir + '/releases.json')
const trackRelease = require(sourceDataDir + '/track_release.json')
const artists = require(sourceDataDir + '/artists.json')
const artistTrack = require(sourceDataDir + '/artist_track.json')

const getName = function (id) {
  return individuals.filter(function (elem) {
    return elem._id === id
  })[0].names[0]
}

const generateJson = function (individualId) {
  logger.emit('log', 'Generating JSON data for individual with ID of ' + individualId + '...')

  const sourceLabel = getName(individualId)

  const tracksWithIndividual = individualTrack.filter(function (elem) {
    return elem.individual_id === individualId
  }).map(function (elem) {
    return elem.track_id
  })

  const tracksDetailsForIndividual = tracks.filter(function (elem) {
    return tracksWithIndividual.indexOf(elem._id) > -1
  })

  tracksDetailsForIndividual.forEach(function (track) {
    const trackReleaseIds = trackRelease.filter(function (relation) {
      return relation.track_id === track._id
    }).map(function (elem) { return elem.release_id })

    track.releases = releases.filter(function (release) {
      return trackReleaseIds.indexOf(release._id) > -1
    })

    const trackArtistIds = artistTrack.filter(function (relation) {
      return relation.track_id === track._id
    }).map(function (elem) { return elem.artist_id })

    track.artists = artists.filter(function (artist) {
      return trackArtistIds.indexOf(artist._id) > -1
    })
  })

  const trackCounts = {}
  const trackArrays = {}
  const connectedIndividuals = individualTrack.filter(function (elem) {
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

  const file = individualId + '.json'
  const formattedOutput = JSON.stringify({
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
