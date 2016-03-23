'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
var db = require('nypl-registry-utils-database')
// var _ = require('highland')

/**
* Given max and min it will distrubute across the requested number as a array of objects and add the min to the total of each one.
* This is used to divide up a range of numbers into more or less equal chunks, we add the min to it so they are valid bnumbers in the range
* @param  {int} max number -
* @param  {int} min number -
* @param  {int} count - split among how many

* @return {array} - an array of objects: { start: 12345, stop: 54321 }
*/
exports.returnDistributedArray = (max, min, count) => {
  var perBot = (max - min) / count
  return Array.from(new Array(count), (x, i) => {
    return {start: Math.floor(i * perBot + min), end: Math.floor((i + 1) * perBot + min)}
  })
}

/**
* Given a viaf ID it will return agent info from agents collection
*
* @param  {string} viaf - a string of the VIAF ID
* @param  {function} cb - callback
*/
exports.returnAgentByViaf = function (viaf, cb) {
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.find({ viaf: viaf.toString() }).toArray((err, viafData) => {
      if (err) console.log(err)
      if (viafData.length === 0) {
        cb(err, {id: viaf, data: false})
      } else {
        cb(err, {id: viaf, data: viafData[0]})
      }
    })
  })
}

/**
* Given a viaf ID it will return VIAF data from our viaf lookup collection
*
* @param  {string} viaf - a string of the VIAF ID
* @param  {function} cb - callback
*/
exports.returnViafData = (viaf, cb) => {
  db.returnCollectionRegistry('viaf', (err, viafCollection) => {
    if (err) console.log(err)
    viafCollection.find({ viaf: viaf.toString() }).toArray((err, viafData) => {
      if (err) console.log(err)

      if (viafData.length > 1) console.log(`WARN: ${viaf} has more than one match!`) // TODO some better reporting

      if (viafData.length === 0) {
        // TODO some better reporting
        console.log('Could not find', viaf, 'in viaf lookup table!')
        cb(err, {id: viaf, data: false})
      } else {
        cb(err, {id: viaf, data: viafData[0]})
      }
    })
  })
}

/**
* Update the agents collection by VIAF identfier
*
* @param  {obj} agent - the update agent
* @param  {function} cb - callback
*/
exports.addAgentByViaf = function (agent, cb) {
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.update({viaf: agent.viaf[0]}, { $set: agent }, {upsert: true}, (err, result) => {
      if (err) {
        if (err.toString().search('duplicate key error collection') === -1) {
          db.logError('Agent Serialization - Catalog - Cannot update/insert record:', JSON.stringify({'agent': agent, 'error': err}))
        }
      }
      if (cb) cb()
    })
  })
}
