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
      db.returnCollectionRegistry('tmsObjects', (err, tmsObjects) => {
        if (err) console.log(err)
        tmsObjects.find({}, {objectID: 1}).sort({objectID: 1}).limit(1).toArray((err, resultsMin) => {
          if (err) console.log(err)
          tmsObjects.find({}, {objectID: 1}).sort({objectID: -1}).limit(1).toArray((err, resultsMax) => {
            if (err) console.log(err)
            var minObjectId = resultsMin[0].objectID
            var maxObjectId = resultsMax[0].objectID + 10 // add ten so it overshoots the end, make sure the last record it done
            callback(utils.returnDistributedArray(maxObjectId, minObjectId, splitCount))
          })
        })
      })
    }

    // fire off a count request so we know the progress
    db.returnCollectionRegistry('tmsObjects', (err, tmsObjects) => {
      if (err) console.log(err)
      tmsObjects.count((err, count) => {
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
          process.stdout.write(clc.black.bgYellowBright(`TMS Agent Serialization: ${Math.floor(totalDone / totalTodo * 100)}% ${totalDone} Agents: ${totalAgentsAdded} Bots:${totalBots}`))
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
    var tmsUtils = require('../lib/utils_tms')
    var _ = require('highland')
    var lexicon = require('nypl-registry-utils-lexicon')

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
        db.returnCollectionRegistry('tmsObjects', (err, tmsObjects) => {
          if (err) console.log(err)
          // this works by streaming a cursor between the two start/end range of bnumbers
          _(tmsObjects.find({$and: [{objectID: {$gte: msg.work.start}}, {objectID: {$lt: msg.work.end}}]}, {'agents': 1, 'objectID': 1}))
            .map((tmsItem) => {
              if (++localCounter % 100 === 0) process.send({ counter: 100 })
              // for debuging
              worked = true
              workedLastOn = tmsItem
              // keep track of where we are
              workStart = tmsItem.objectID
              // ++ the counter
              if (!tmsItem.agents) return ''
              if (tmsItem.agents.length === 0) return ''

              // the TMS names are not stored in LC style, so try to build some possible LC style names and do some other clean up
              tmsItem['agents'] = tmsItem['agents'].map((agent) => {
                // clean up the dates
                if (agent.dateStart) agent.dateStart = (!isNaN(parseInt(agent.dateStart))) ? parseInt(agent.dateStart) : false
                if (agent.dateEnd) agent.dateEnd = (!isNaN(parseInt(agent.dateEnd))) ? parseInt(agent.dateEnd) : false

                if (agent.dateStart === 0) agent.dateStart = false
                if (agent.dateEnd === 0 || agent.dateStart + 100 === agent.dateEnd) agent.dateEnd = false

                agent.checkNames = []
                if (agent.dateStart && agent.dateEnd) {
                  if (agent.nameAlpha.trim() !== '') {
                    agent.checkNames.push(agent.nameAlpha.trim() + ', ' + agent.dateStart + '-' + agent.dateEnd)
                  }
                }
                if (agent.dateStart) {
                  if (agent.nameAlpha.trim() !== '') {
                    agent.checkNames.push(agent.nameAlpha.trim() + ', ' + agent.dateStart + '-')
                  }
                }
                if (agent.nameAlpha.trim() !== '') {
                  if (agent.checkNames.indexOf(agent.nameAlpha.trim()) === -1) agent.checkNames.push(agent.nameAlpha.trim())
                }
                if (agent.nameDisplay.trim() !== '') {
                  if (agent.checkNames.indexOf(agent.nameDisplay.trim()) === -1) agent.checkNames.push(agent.nameDisplay.trim())
                }
                return agent
              })
              return tmsItem
            })
            .compact()
            .map(_.curry(tmsUtils.lookupAgentsInViaf)) // fill in any existing agents
            .nfcall([])
            .series()
            .map(_.curry(tmsUtils.lookupAgentsInRegistryAgentsByViaf)) // fill in any existing agents
            .nfcall([])
            .series()
            .map(_.curry(tmsUtils.lookupAgentsInRegistryAgentsByName)) // fill in any existing agents
            .nfcall([])
            .series()
            .map((tmsItem) => {
              var updateAgents = []
              // we have all the data we need to make a new agent if needed
              tmsItem['agents'].forEach((agent) => {
                if (!agent.agent) {
                  // there are some bad names in there, check against our blacklist
                  if (lexicon.configs.agentNamesBlacklist.indexOf(agent.nameDisplay) > -1) return
                  agent.source = {source: 'tmsObjects', id: tmsItem.objectID}
                  var r = tmsUtils.buildAgentFromTmsAgent(agent)
                  updateAgents.push(r)
                }
              })
              if (updateAgents.length === 0) return ''
              process.send({ counterAdded: updateAgents.length })
              return updateAgents
            })
            .compact()
            .map(_.curry(tmsUtils.updateTmsAgentsByViaf)) // add/update the data to the agents Components (it will filter out non viaf ones)
            .nfcall([])
            .series()
            .map(_.curry(tmsUtils.updateTmsAgentsByName)) // add/update the data to the agents Components
            .nfcall([])
            .series()
            .done((tmsItem) => {
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
