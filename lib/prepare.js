'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
var db = require('nypl-registry-utils-database')
var clc = require('cli-color')

module.exports = function (cb) {
  console.log(clc.whiteBright.bgRedBright('----- About to Drop the Agents Lookup collection registry-ingest in 5 seconds ----- ctrl-c now to abort'))
  setTimeout(function () {
    db.prepareRegistryIngestAgents(function () {
      if (cb) cb()
    })
  }, 5000)
}
