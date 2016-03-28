'use strict'

module.exports = function (cb) {
  var db = require('nypl-registry-utils-database')
  var cluster = require('cluster')
  var utils = require('../lib/utils.js')
  var clc = require('cli-color')
  var totalBots = 15
  var botRanges = []
  //
  // MASTER PROCESS
  //
  if (cluster.isMaster) {
    var totalDone = 0
    var totalTodo = 10000000000
    var totalAgentsAdded = 0

    // finds the counts in the bib records and split it up among the number of requested bots
    var findBibSplit = (splitCount, callback) => {
      db.returnCollectionRegistry('archivesComponents', (err, archivesComponents) => {
        if (err) console.log(err)
        archivesComponents.find({}, {mssDb: 1}).sort({mssDb: 1}).limit(1).toArray((err, resultsMin) => {
          if (err) console.log(err)
          archivesComponents.find({}, {mssDb: 1}).sort({mssDb: -1}).limit(1).toArray((err, resultsMax) => {
            if (err) console.log(err)
            var minMssDb = resultsMin[0]._id
            var maxMssDb = resultsMax[0]._id + 10 // add ten so it overshoots the end, make sure the last record it done
            callback(utils.returnDistributedArray(maxMssDb, minMssDb, splitCount))
          })
        })
      })
    }

    // fire off a count request so we know the progress
    db.returnCollectionRegistry('archivesComponents', (err, archivesComponents) => {
      if (err) console.log(err)
      archivesComponents.count((err, count) => {
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
          process.stdout.cursorTo(0)
          process.stdout.write(clc.black.bgYellowBright(`Archives Components Agent Serialization: ${Math.floor(totalDone / totalTodo * 100)}% ${totalDone} Agents: ${totalAgentsAdded} Bots:${totalBots}`))
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
          if (cb) {
            cb()
            cb = null // make sure it doesn't get called again since we are using setTimeout to check the worker status
          }
        }
      }, 500)
    })
  } else {
    //
    // THE WORKER
    //
    var archivesUtils = require('../lib/utils_archives')
    var _ = require('highland')
    // keep track of what we are working on incase we need to ask the master process to restart the worker
    var workStart = 0
    var workEnd = 0
    var localCounter = 0

    // useful for debuging and restarting incase something bad happens
    var worked = false
    var workedLastOn = null
    setInterval(() => {
      if (!worked) {
        // console.log(`${cluster.worker.id} has not worked in the last few min:`, workedLastOn)
        db.logError(`${cluster.worker.id} has not worked in the last few min:`, JSON.stringify(workedLastOn))
        console.log(`Going to restart worker: ${cluster.worker.id}`)
        process.send({ restart: { start: workStart, end: workEnd } })
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
        workStart = msg.work.start
        workEnd = msg.work.end
        db.returnCollectionRegistry('archivesComponents', (err, archivesComponents) => {
          if (err) console.log(err)
          // this works by streaming a cursor between the two start/end range of bnumbers
          _(archivesComponents.find({$and: [{mssDb: {$gte: msg.work.start}}, {mssDb: {$lt: msg.work.end}}]}, {'agents': 1, 'mssDb': 1}))
            .map((archivesComponents) => {
              if (++localCounter % 1000 === 0) process.send({ counter: 1000 })
              // for debuging
              worked = true
              workedLastOn = archivesComponents
              // keep track of where we are
              workStart = archivesComponents.mssDb
              // ++ the counter
              if (!archivesComponents.agents) return ''
              if (archivesComponents.agents.length === 0) return ''

              return archivesComponents
            })
            .compact()
            .map(_.curry(archivesUtils.lookupAgentsInViaf)) // fill in any existing agents
            .nfcall([])
            .series()
            .map(_.curry(archivesUtils.lookupAarchivesAgentsInRegistryAgentsByViaf)) // fill in any existing agents
            .nfcall([])
            .series()
            .map(_.curry(archivesUtils.lookupAarchivesAgentsInRegistryAgentsByName)) // fill in any existing agents
            .nfcall([])
            .series()
            .map((archivesComponents) => {
              var updateAgents = []
              // we have all the data we need to make a new agent if needed
              archivesComponents['agents'].forEach((agent) => {
                if (!agent.agent && agent.namePart) {
                  agent.source = {source: 'archivesComponents', id: archivesComponents.mssDb}
                  var r = archivesUtils.buildAgentFromArchiveAgent(agent)
                  updateAgents.push(r)
                }
              })
              if (updateAgents.length === 0) return ''
              process.send({ counterAdded: updateAgents.length })
              return updateAgents
            })
            .compact()
            .map(_.curry(archivesUtils.updateArchivesAgentsByViaf)) // add/update the data to the agents Components (it will filter out non viaf ones)
            .nfcall([])
            .series()
            .map(_.curry(archivesUtils.updateArchivesAgentsByName)) // add/update the data to the agents Components
            .nfcall([])
            .series()
            .done((archivesComponents) => {
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
