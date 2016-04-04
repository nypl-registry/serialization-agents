'use strict'
var crier = require('nypl-registry-utils-crier')
var db = require('nypl-registry-utils-database')
var clc = require('cli-color')

module.exports = function (cb) {
  console.log(clc.whiteBright.bgRedBright('----- About to Drop the Agents Lookup collection registry-ingest in 5 seconds ----- ctrl-c now to abort'))
  crier.registrySay(':sleuth_or_spy: :sleuth_or_spy: Agent Serialization Starting - Dropping registry-ingest agent lookup. :sleuth_or_spy: :sleuth_or_spy:')
  setTimeout(function () {
    db.prepareRegistryIngestAgents(function () {
      if (cb) cb()
    })
  }, 5000)
}
