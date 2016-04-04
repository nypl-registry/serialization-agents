'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
var db = require('nypl-registry-utils-database')
var viafUtils = require('./viaf')
var viafWrapper = require('viaf-wrapper')
var normalize = require('nypl-registry-utils-normalize')

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

exports.returnAgentByName = function (name, cb) {
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.find({ nameNormalized: normalize.normalizeAndDiacritics(name) }).toArray((err, records) => {
      if (err) console.log(err)
      if (records.length === 0) {
        if (cb) cb(err, {name: name, data: false})
      } else {
        // figure out which to use based on the best controled term name
        var bestScore = -1
        var useName = false
        records.forEach(function (r) {
          var s = normalize.normalizeAndDiacritics(name).score(normalize.normalizeAndDiacritics(r.nameControlled), 0.5)
          if (s > bestScore) {
            bestScore = s
            useName = r
          }
        })
        if (cb) cb(err, {name: name, data: useName})
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
        // console.log('Could not find', viaf, 'in viaf lookup table!')

        // we are going to try to figure this out in an attemp to not have a dead VIAF id
        viafUtils.returnAllViafData(viaf.toString(), (err, results) => {
          if (err) console.log(err)
          var blankViaf = { flag: true, '_id': '', 'viaf': [], 'sourceCount': 1, 'type': false, 'hasLc': (results.checkForLc), 'hasDbn': false, 'lcId': (!results.checkForLc) ? false : results.checkForLc, 'gettyId': false, 'wikidataId': false, 'lcTerm': false, 'dnbTerm': false, 'viafTerm': false, 'birth': false, 'death': false, 'dbpediaId': false, 'normalized': [] }
          // can we solve it with a redirect?
          if (results.checkRedirect) {
            blankViaf._id = results.checkRedirect
            blankViaf.viaf.push(results.checkRedirect)
            blankViaf.viaf.push(viaf.toString()) // add the bad one in there too for others to lookup against

            viafWrapper.getViaf(blankViaf._id).then((record) => {
              if (record.nameType) blankViaf.type = record.nameType
              if (record.birthDate) blankViaf.birth = record.birthDate
              if (record.deathDate) blankViaf.death = record.deathDate
              if (record.heading) blankViaf.viafTerm = record.heading

              record.mainHeadingEls.forEach((heading) => {
                if (heading.source === 'DNB' && heading.a) {
                  blankViaf.hasDbn = true
                  blankViaf.dnbTerm = heading.a
                }
                if (heading.source === 'LC' && heading.a) {
                  blankViaf.hasLc = true
                  blankViaf.lcTerm = heading.a
                }
              })
              record.sources.forEach((source) => {
                if (source.source === 'LC' && source.nsid) {
                  blankViaf.lcId = source.nsid
                }
                if (source.source === 'WKP' && source.nsid) {
                  blankViaf.wikidataId = source.nsid
                }
                if (source.source === 'JPG' && source.nsid) {
                  blankViaf.gettyId = source.nsid
                }
              })
              // console.log('Checked viaf')
              // console.log(blankViaf)
              cb(err, {id: viaf, data: blankViaf})
            })

            return
          }

          // if it is deleted and there is an alt LC found we will try to get the VIAF
          if (results.checkForDeleted && results.checkForLc) {
            viafUtils.returnLcUseInstead(results.checkForLc, (err, results) => {
              if (err) console.log(err)
              // we tried, but could not get a VIAF out of all that mess
              if (!results) {
                cb(err, {id: viaf, data: false})
                return false
              }
              blankViaf._id = results
              blankViaf.viaf.push(results)
              blankViaf.viaf.push(viaf.toString()) // add the bad one in there too for others to lookup against
              viafWrapper.getViaf(results).then((record) => {
                if (record.nameType) blankViaf.type = record.nameType
                if (record.birthDate) blankViaf.birth = record.birthDate
                if (record.deathDate) blankViaf.death = record.deathDate
                if (record.heading) blankViaf.viafTerm = record.heading

                record.mainHeadingEls.forEach((heading) => {
                  if (heading.source === 'DNB' && heading.a) {
                    blankViaf.hasDbn = true
                    blankViaf.dnbTerm = heading.a
                  }
                  if (heading.source === 'LC' && heading.a) {
                    blankViaf.hasLc = true
                    blankViaf.lcTerm = heading.a
                  }
                })
                record.sources.forEach((source) => {
                  if (source.source === 'LC' && source.nsid) {
                    blankViaf.lcId = source.nsid
                  }
                  if (source.source === 'WKP' && source.nsid) {
                    blankViaf.wikidataId = source.nsid
                  }
                  if (source.source === 'JPG' && source.nsid) {
                    blankViaf.gettyId = source.nsid
                  }
                })
                // console.log('Checked viaf')
                // console.log(blankViaf)

                cb(err, {id: viaf, data: blankViaf})
              })
            })

            return
          }

          // no luck with any of thoese stragies
          cb(err, {id: viaf, data: false})
        })
      } else {
        cb(err, {id: viaf, data: viafData[0]})
      }
    })
  })
}

/**
* Given a naf ID it will return VIAF data from our viaf lookup collection
*
* @param  {string} lcId - a string of the lcId/naf ID
* @param  {function} cb - callback
*/
exports.returnViafDataByNaf = (lcId, cb) => {
  db.returnCollectionRegistry('viaf', (err, viafCollection) => {
    if (err) console.log(err)
    viafCollection.find({ lcId: lcId }).toArray((err, viafData) => {
      if (err) console.log(err)
      if (viafData.length === 0) {
        cb(err, {id: lcId, data: false})
      } else {
        cb(err, {id: lcId, data: viafData[0]})
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
exports.addAgentByViaf = (agent, cb) => {
  // console.log('addAgentByViaf', agent)
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.update({viaf: agent.viaf[0]}, { $set: agent }, {upsert: true}, (err, result) => {
      if (err) {
        if (err.toString().search('nameControlled_1 dup key') > -1) {
          exports.mergeAgentOnNameConflict(agent, (err, useAgent) => {
            if (err) console.log(err)
            // overwrite the existing agent if that was sucessful
            if (useAgent) {
              agents.update({nameControlled: useAgent.nameControlled}, useAgent, (err, result) => {
                if (err) console.log(err)
                if (cb) cb(null, null)
              })
            } else {
              if (cb) cb(null, null)
            }
          })
        } else if (err.toString().search('viaf_1 dup key') > -1) {
          if (cb) cb(null, null)
        } else {
          db.logError('Agent Serialization - Catalog - Cannot update/insert record:', JSON.stringify({'agent': agent, 'error': err}))
          if (cb) cb(null, null)
        }
      } else {
        if (cb) cb(null, null)
      }
    })
  })
}

/**
* Update the agents collection by the namecontrolled string
*
* @param  {obj} agent - the update agent
* @param  {function} cb - callback
*/
exports.addAgentByName = function (agent, cb) {
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.update({ nameControlled: agent.nameControlled }, { $set: agent }, {upsert: true}, function (err, result) {
      if (err) {
        if (err.toString().search('nameControlled_1 dup key') === -1) {
          db.logError('Agent Serialization - Catalog - Cannot update/insert record:', JSON.stringify({'agent': agent, 'error': err}))
        }
      }
      if (cb) cb(null, null)
    })
  })
}

/**
* Merge Agent based on VIAF name Conflicts
*
* @param  {obj} agent - the update agent
* @param  {function} cb - callback
*/
exports.mergeAgentOnNameConflict = function (newAgent, cb) {
  db.returnCollectionRegistry('agents', (err, agents) => {
    if (err) console.log(err)
    agents.find({ nameControlled: newAgent.nameControlled }).toArray((err, existingAgent) => {
      if (err) console.log(err)
      existingAgent = existingAgent[0]

      // if the existing agent does not have a viaf currently swap it out for this one
      if (typeof existingAgent.viaf === 'string') {
        cb(null, newAgent)
      } else {
        // we are going to merge anything in the new agent into the existing agent using any good data in the new agent
        var didMerge = false
        newAgent.viaf.forEach((viaf) => {
          if (existingAgent.viaf.indexOf(viaf) === -1) {
            existingAgent.viaf.push(viaf)
            if (!existingAgent.viafMerged) existingAgent.viafMerged = []
            existingAgent.viafMerged.push(viaf)
            didMerge = true
          }
        })
        if (didMerge) {
          if (!existingAgent.mergeSource) existingAgent.mergeSource = []
          existingAgent.mergeSource.push(newAgent.source)
        }

        newAgent.fast.forEach((fast) => {
          if (existingAgent.fast.indexOf(fast) === -1) existingAgent.fast.push(fast)
        })
        newAgent.nameNormalized.forEach((nameNormalized) => {
          if (newAgent.nameNormalized.indexOf(nameNormalized) === -1) existingAgent.nameNormalized.push(nameNormalized)
        })

        if (!existingAgent.wikidata && newAgent.wikidata) existingAgent.wikidata = newAgent.wikidata
        if (!existingAgent.lcId && newAgent.lcId) existingAgent.lcId = newAgent.lcId
        if (!existingAgent.ulan && newAgent.ulan) existingAgent.ulan = newAgent.ulan
        if (!existingAgent.dbpedia && newAgent.dbpedia) existingAgent.dbpedia = newAgent.dbpedia
        if (!existingAgent.birth && newAgent.birth) existingAgent.birth = newAgent.birth
        if (!existingAgent.death && newAgent.death) existingAgent.death = newAgent.death
        if (!existingAgent.type && newAgent.type) existingAgent.type = newAgent.type

        var altFormsIndex = existingAgent.altForms.map((altForm) => altForm.name)
        newAgent.altForms.forEach((altForm) => {
          if (altFormsIndex.indexOf(altForm.name) === -1) existingAgent.altForms.push(altForm)
        })
        cb(null, existingAgent)
      }
    })
  })
}
