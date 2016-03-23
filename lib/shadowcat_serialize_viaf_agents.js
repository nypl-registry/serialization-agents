'use strict'

module.exports = function shadowcatSerializeViafAgents (cb) {
  var db = require('nypl-registry-utils-database')
  var cluster = require('cluster')
  var utils = require('../lib/utils.js')
  var clc = require('cli-color')
  var totalBots = 10

  // finds the counts in the bib records and split it up among the number of requested bots
  var findBibSplit = (splitCount, callback) => {
    db.returnCollectionShadowcat('bib', (err, bibs) => {
      if (err) console.log(err)
      bibs.find({}, {_id: 1}).sort({_id: 1}).limit(1).toArray((err, resultsMin) => {
        if (err) console.log(err)
        bibs.find({}, {_id: 1}).sort({_id: -1}).limit(1).toArray((err, resultsMax) => {
          if (err) console.log(err)
          var minBnumber = resultsMin[0]._id
          var maxBnumber = resultsMax[0]._id
          callback(utils.returnDistributedArray(maxBnumber, minBnumber, splitCount))
        })
      })
    })
  }

  if (cluster.isMaster) {
    var totalDone = 0
    var totalTodo = 10000000000

    db.returnCollectionShadowcat('bib', (err, bibs) => {
      if (err) console.log(err)
      bibs.count((err, count) => {
        if (err) console.log(err)
        totalTodo = count
      })
    })

    // grab all the collections we need to look at
    findBibSplit(totalBots, (botSplit) => {
      botSplit.forEach((x) => {
        var worker = cluster.fork()
        console.log('Spawing worker', worker.id)
        worker.on('message', function (msg) {
          // asking for a collection to work, send it or tell them to exit
          if (msg.request) {
            if (botSplit.length === 0) {
              worker.send({ die: true })
            } else {
              worker.send({ work: botSplit.shift() })
            }
          }
          if (msg.counter) {
            process.stdout.cursorTo(0)
            process.stdout.write(clc.black.bgYellowBright(`Shadowcat VIAF Agents Serialization: ${Math.floor(totalDone / totalTodo * 100)}% ${++totalDone}`))
          }
        })
      })
    })

    cluster.on('exit', (worker, code, signal) => {
      setTimeout(() => {
        if (Object.keys(cluster.workers).length === 0) {
          if (cb) {
            cb()
            cb = null // make sure it doesn't get called again since we are using setTimeout to check the worker status
          }
        }
      }, 500)
    })
  } else {
    console.log('SPAWNED')
    var shadowcatUtils = require('../lib/utils_shadowcat')
    var _ = require('highland')
    // THE WORKER
    process.on('message', (msg) => {
      if (msg.die) {
        console.log('Done Working. #', cluster.worker.id)
        process.exit(0)
      }
      if (msg.work) {
        db.returnCollectionShadowcat('bib', (err, bibs) => {
          if (err) console.log(err)
          _(bibs.find({$and: [{_id: {$gte: msg.work.start}}, {_id: {$lt: msg.work.end}}]}, {'sc:agents': 1, 'sc:research': 1}))
            .map((bib) => {
              // filter out non research stuff
              if (!bib['sc:research']) return ''
              // we don't want any non VIAF in this pass so filter them out
              bib['sc:agents'] = bib['sc:agents'].filter((agent) => (agent.viaf))
              // filter out if no agents
              if (bib['sc:agents'].length === 0) return ''
              return bib
            })
            .compact()
            .map(_.curry(shadowcatUtils.lookupShadowcatAgentsInViaf)) // fill in the VIAF data
            .nfcall([])
            .series()
            .map(_.curry(shadowcatUtils.lookupShadowcatAgentsInRegistryAgentsByViaf)) // fill in the agent data if any
            .nfcall([])
            .series()
            .map((bib) => {
              var updateAgents = []
              var addedViafs = []
              // we have all the data we need to make a new agent if needed
              bib['sc:agents'].forEach((agent) => {
                agent.source = bib._id

                var r = shadowcatUtils.mergeScAgentViafRegistryAgent(agent)

                if (!r.viaf) {
                  console.log('No VIAF, Will not add this agent as a viaf:')
                  console.log(agent)
                } else {
                  if (JSON.stringify(r) !== JSON.stringify(agent.agent)) {
                    if (addedViafs.indexOf(r.viaf[0]) === -1) {
                      updateAgents.push(r)
                      addedViafs.push(r.viaf[0])
                    }
                  }
                }
              })
              return updateAgents
            })
            .compact()
            .map(_.curry(shadowcatUtils.updateShadowcatAgentsByViaf)) // add/update the data to the agents collection
            .nfcall([])
            .series()
            .map((updateAgents) => process.send({ counter: true }))
            .done((bib) => {
              console.log('Done')
              if (cb) cb()
            })
        })
      }
    })

    // ask for the our assignment
    process.send({ request: true })
  }
}
