'use strict'

module.exports = function shadowcatSerializeViafAgents (cb) {
  var db = require('nypl-registry-utils-database')
  var crier = require('nypl-registry-utils-crier')
  var cluster = require('cluster')
  var utils = require('../lib/utils.js')
  var clc = require('cli-color')
  var totalBots = 20
  var botRanges = []
  //
  // MASTER PROCESS
  //
  if (cluster.isMaster) {
    var totalDone = 0
    var totalTodo = 10000000000
    var totalAgentsAdded = 0
    var percent = 0
    var oldPercent = -1
    var activeMessage = ''

    crier.registrySay(':vertical_traffic_light: Agent Serialization Shadowcat agents with VIAF starting.')

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

    // fire off a count request so we know the progress
    db.returnCollectionShadowcat('bib', (err, bibs) => {
      if (err) console.log(err)
      bibs.count((err, count) => {
        if (err) console.log(err)
        totalTodo = count
      })
    })

    // this function spawns the worker and handles passing out bib ranges ++ the counter and restarting a worker if needed
    var spawnWorker = () => {
      var worker = cluster.fork()
      console.log('Spawing worker', worker.id)
      worker.on('message', function (msg) {
        // when a worker sends a "request" message we return one of the ranges for it to work on
        if (msg.request) {
          if (botRanges.length === 0) {
            worker.send({ die: true })
          } else {
            worker.send({ work: botRanges.shift() })
          }
        }
        // when the worker sends a counter message we ++ the counter
        if (msg.counter) {
          totalDone = totalDone + msg.counter
          percent = Math.floor(totalDone / totalTodo * 100)
          activeMessage = `Shadowcat VIAF Agent Serialization: ${percent}% ${totalDone} Bibs worked. Agents Added: ${totalAgentsAdded} Bots:${totalBots}`
          if (percent % 5 === 0 && percent !== oldPercent) {
            crier.registrySay(activeMessage)
            oldPercent = percent
          }
          process.stdout.cursorTo(0)
          process.stdout.write(clc.black.bgYellowBright(activeMessage))
        }
        if (msg.counterAdded) {
          totalAgentsAdded = totalAgentsAdded + msg.counterAdded
        }

        if (msg.restart) {
          console.log('Restarting this range:', msg.restart)
          botRanges.push(msg.restart)
          spawnWorker()
          totalBots++
        }
      })
    }

    // will return a array of objects telling what bnumber to start and end on
    // loop through and spawn a worker for each range of bnumbers
    findBibSplit(totalBots, (botSplit) => {
      // asign it to the master scoped var
      botRanges = botSplit
      // spawn one for each range
      botSplit.forEach((x) => {
        spawnWorker()
      })
    })

    // when the worker exists we wait a sec and see if it was the last worker, if so kill the main process == end of the script
    cluster.on('exit', (worker, code, signal) => {
      totalBots = totalBots - 1
      setTimeout(() => {
        if (Object.keys(cluster.workers).length === 0) {
          crier.registrySay(activeMessage)
          crier.registrySay(':checkered_flag: Shadowcat VIAF Agent Serialization: Complete')
          if (cb) {
            setTimeout(() => {
              cb()
              cb = null // make sure it doesn't get called again since we are using setTimeout to check the worker status
            }, 1000)
          }
        }
      }, 500)
    })
  } else {
    //
    // THE WORKER
    //
    var shadowcatUtils = require('../lib/utils_shadowcat')
    var _ = require('highland')
    // keep track of what we are working on incase we need to ask the master process to restart the worker
    var bibStart = 0
    var bibEnd = 0
    var localCounter = 0

    // useful for debuging and restarting incase something bad happens
    var worked = false
    var workedLastOn = null
    setInterval(() => {
      if (!worked) {
        // console.log(`${cluster.worker.id} has not worked in the last few min:`, workedLastOn)
        db.logError(`${cluster.worker.id} has not worked in the last few min:`, JSON.stringify(workedLastOn))
        console.log(`Going to restart worker: ${cluster.worker.id}`)
        process.send({ restart: { start: bibStart, end: bibEnd } })
        process.exit(1)
      }
      worked = false
    }, 120000)

    process.on('message', (msg) => {
      if (msg.die) {
        console.log('Done Working. #', cluster.worker.id)
        process.exit(0)
      }
      if (msg.work) {
        bibStart = msg.work.start
        bibEnd = msg.work.end
        db.returnCollectionShadowcat('bib', (err, bibs) => {
          if (err) console.log(err)
          // this works by streaming a cursor between the two start/end range of bnumbers
          _(bibs.find({$and: [{_id: {$gte: msg.work.start}}, {_id: {$lt: msg.work.end}}]}, {'sc:agents': 1, 'sc:research': 1}))
            .map((bib) => {
              // for debuging
              worked = true
              workedLastOn = bib

              // keep track of where we are
              bibStart = bib._id
              if (++localCounter % 100 === 0 && localCounter !== 0) process.send({ counter: 100 })

              // filter out non research stuff
              if (!bib['sc:research']) return ''
              if (!bib['sc:agents']) return ''
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
              var updateAgentsJsonCheck = []
              // we have all the data we need to make a new agent if needed
              bib['sc:agents'].forEach((agent) => {
                // add in the bnumber source to put it into the agent object
                agent.source = {source: 'shadowcat', id: bib._id}
                // merge all the data into the agent
                var r = shadowcatUtils.mergeScAgentViafRegistryAgent(agent)
                var rJson = JSON.stringify(r)
                if (!r.viaf) {
                  console.log(`^^ No VIAF found ${agent.viafOg}. Will not add this agent as a viaf. Going to delete VIAF id from host system bnumber: ${agent.source.id} `)
                  shadowcatUtils.removeViafFromShadowcatAgent(agent.source.id, agent.viafOg, (err, results) => {
                    if (err) console.log(err)
                  })
                } else {
                  if (updateAgentsJsonCheck.indexOf(rJson) === -1) {
                    updateAgentsJsonCheck.push(rJson)
                    updateAgents.push(r)
                  }
                }
              })
              process.send({ counterAdded: updateAgents.length })
              return updateAgents
            })
            .map(_.curry(shadowcatUtils.updateShadowcatAgentsByViaf)) // add/update the data to the agents collection
            .nfcall([])
            .series()
            .done((bib) => {
              console.log('Done')
              console.log('Done Working. #', cluster.worker.id)
              process.exit(0)
            })
        })
      }
    })

    // ask for the our assignment, the bnumber range
    process.send({ request: true })
  }
}
