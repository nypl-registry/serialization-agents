'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
var db = require('nypl-registry-utils-database')
var _ = require('highland')
var utils = require('./utils')
var normalize = require('nypl-registry-utils-normalize')

/**
* Lookup all sc:agents
*
* @param  {array} agents - Array of 'sc:agents'
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupShadowcatAgentsInViaf = (bib, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {}

  _(bib['sc:agents'])
    .map((agent) => {
      if (lookup[agent.viaf]) return ''
      return agent.viaf
    })
    .compact()
    .map(_.curry(utils.returnViafData))
    .nfcall([])
    .parallel(5)
    .map((results) => {
      lookup[results.id] = results.data
    })
    .done(() => {
      // backfill in the data
      bib['sc:agents'] = bib['sc:agents'].map((agent) => {
        agent.viafOg = agent.viaf.toString()
        agent.viaf = lookup[agent.viaf.toString()]
        return agent
      })
      if (cb) cb(null, bib)
    })
}

/**
* Lookup all sc:agents in existing agents collection
*
* @param  {array} agents - Array of 'sc:agents'
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupShadowcatAgentsInRegistryAgentsByViaf = (bib, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {}

  _(bib['sc:agents'])
    .map((agent) => {
      // take the viaf ID out of the viaf data and pass it on to the lookup
      if (lookup[agent.viaf._id]) return ''
      return agent.viaf._id
    })
    .compact()
    .map(_.curry(utils.returnAgentByViaf))
    .nfcall([])
    .parallel(5)
    .map((results) => {
      // assing the results of the viaf search to our lookup
      lookup[results.id] = results.data
    })
    .done(() => {
      // backfill in the data
      bib['sc:agents'] = bib['sc:agents'].map((agent) => {
        agent.agent = lookup[agent.viaf._id]
        return agent
      })
      if (cb) cb(null, bib)
    })
}

/**
* loop through all the agents to be updated
*
* @param  {array} agents - Array of 'sc:agents'
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.updateShadowcatAgentsByViaf = (agents, cb) => {
  _(agents)
    .map(_.curry(utils.addAgentByViaf))
    .nfcall([])
    .parallel(5)
    .done((agents) => {
      if (cb) cb(null, agents)
    })
}

/**
* Remove a viaf from the sc:agents in shadowcat, if it is bad and we cannot get from VIAF the right information consider that agent uncontrolled
*
* @param  {int} bnumber - The bnumber
* @param  {string} viaf - The VIAF id
* @param  {function} cb - callback
*/
exports.removeViafFromShadowcatAgent = (bnumber, viaf, cb) => {
  db.returnCollectionShadowcat('bib', (err, bibs) => {
    if (err) console.log(err)
    bibs.find({_id: parseInt(bnumber)}, {'sc:agents': 1}).toArray((err, results) => {
      if (err) console.log(err)
      if (results[0]) {
        results = results[0]
        results['sc:agents'] = results['sc:agents'].map((agent) => {
          if (agent.viaf === viaf) {
            agent.viaf = false
          }
          return agent
        })
        bibs.update({_id: parseInt(bnumber)}, {$set: {'sc:agents': results['sc:agents']}}, (err, results) => {
          cb(err, null)
        })
      } else {
        cb(err, null)
      }
    })
  })
}

/**
* Creating an agent it needs to merge the source information (scAgent) with any VIAF data we have on had and a existing registry agent if it exists
*
* @param  {obj} agent - an object that contains the shadowcat data, viaf lookup data, registry agent data and record source identifier
* @return {obj} viaf data -
*/
exports.mergeScAgentViafRegistryAgent = function (agent) {
  var scAgent = agent
  var viaf = agent.viaf
  var registryAgent = agent.agent
  var source = agent.source

  // if it has no registryAgent yet that means we are creating a new one
  if (scAgent && !registryAgent) {
    var newAgent = {
      viaf: false,
      registry: 'temp' + Date.now() + Math.floor(Math.random() * (1000000 - 1)) + 1,
      nameControlled: false,
      wikidata: false,
      lcId: false,
      ulan: false,
      dbpedia: false,
      birth: false,
      death: false,
      type: false,
      source: false,
      altForms: [],
      nameNormalized: [],
      fast: []
    }

    // if it has a VIAF then we need to incorporate that info
    if (viaf) {
      newAgent.viaf = viaf.viaf
      // newAgent.viafAll = [viaf._id]

      // we have the VIAF data lets fill that in
      if (viaf.lcTerm) {
        newAgent.nameControlled = viaf.lcTerm
      } else if (viaf.viafTerm) {
        newAgent.nameControlled = viaf.viafTerm
      } else if (scAgent.nameLocal) {
        newAgent.nameControlled = scAgent.nameLocal
      } else if (scAgent.nameViaf) {
        newAgent.nameControlled = scAgent.nameViaf
        scAgent.nameLocal = scAgent.nameViaf // to build a normalized lookup
      }

      // lets collapse these too
      if (!newAgent.nameControlled) {
        console.log(newAgent)
        console.log(scAgent)
      }

      if (newAgent.nameControlled) newAgent.nameControlled = newAgent.nameControlled.replace(/\s\(Spirit\)/gi, '')

      if (viaf.type) newAgent.type = viaf.type.toLowerCase()

      if (viaf.wikidataId) newAgent.wikidata = viaf.wikidataId
      if (viaf.lcId) newAgent.lcId = viaf.lcId
      if (viaf.gettyId) newAgent.ulan = parseInt(viaf.gettyId)
      if (viaf.dbpedia) newAgent.dbpedia = viaf.dbpedia
      if (viaf.birth) newAgent.birth = viaf.birth
      if (viaf.death) newAgent.death = viaf.death
      if (viaf.fast) newAgent.fast = viaf.fast
      var normal = null

      if (viaf.lcTerm) {
        normal = normalize.normalizeAndDiacritics(viaf.lcTerm).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: viaf.lcTerm, type: 'viaf.lcTerm', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, viaf.lcTerm), fuzzy: newAgent.nameControlled.score(viaf.lcTerm, 0.5)})
        }
      }
      if (viaf.viafTerm) {
        normal = normalize.normalizeAndDiacritics(viaf.viafTerm).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: viaf.viafTerm, type: 'viaf.viafTerm', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, viaf.viafTerm), fuzzy: newAgent.nameControlled.score(viaf.viafTerm, 0.5)})
        }
      }
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)

          newAgent.altForms.push({name: scAgent.nameLocal, type: 'scAgent.nameLocal', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLocal), fuzzy: newAgent.nameControlled.score(scAgent.nameLocal, 0.5)})
        }
      }

      return newAgent
    } else if (!viaf && scAgent.viaf) {
      // this is a potential problem, there is a VIAF id, but we did not find it in our lookup table, record an error
      db.logError('Agent Serialization - shadowcat - No VIAF found in lookup table', JSON.stringify(scAgent))

      // we have no VIAF info and no existing registry agent, populate the registry agent based on what we have from the scagent
      if (scAgent.nameLc) {
        newAgent.nameControlled = scAgent.nameLc
      } else if (scAgent.nameViaf) {
        newAgent.nameControlled = scAgent.nameViaf
      } else {
        newAgent.nameControlled = scAgent.nameLocal
      }

      if (typeof scAgent.type !== 'string') console.log(scAgent)
      if (scAgent.type) newAgent.type = scAgent.type.toLowerCase()
      // we do not trust the VIAF number
      // newAgent.viaf = scAgent.viaf

      if (scAgent.nameLc) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLc).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameLc, type: 'scAgent.nameLc', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLc), fuzzy: newAgent.nameControlled.score(scAgent.nameLc, 0.5)})
        }
      }
      if (scAgent.nameViaf) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameViaf).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameViaf, type: 'scAgent.nameViaf', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameViaf), fuzzy: newAgent.nameControlled.score(scAgent.nameViaf, 0.5)})
        }
      }
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameLocal, type: 'scAgent.nameLocal', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLocal), fuzzy: newAgent.nameControlled.score(scAgent.nameLocal, 0.5)})
        }
      }

      return newAgent
    } else {
      // there is no agent and also we don't have any VIAF info, so populate what we can

      if (scAgent.nameLc) {
        newAgent.nameControlled = scAgent.nameLc
      } else if (scAgent.nameViaf) {
        newAgent.nameControlled = scAgent.nameViaf
      } else {
        newAgent.nameControlled = scAgent.nameLocal
      }
      newAgent.type = (scAgent.type) ? scAgent.type.toLowerCase() : 'personal'

      if (scAgent.nameLc) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLc).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameLc, type: 'scAgent.nameLc', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLc), fuzzy: newAgent.nameControlled.score(scAgent.nameLc, 0.5)})
        }
      }
      if (scAgent.nameViaf) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameViaf).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameViaf, type: 'scAgent.nameViaf', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameViaf), fuzzy: newAgent.nameControlled.score(scAgent.nameViaf, 0.5)})
        }
      }
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (newAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          newAgent.nameNormalized.push(normal)
          newAgent.altForms.push({name: scAgent.nameLocal, type: 'scAgent.nameLocal', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLocal), fuzzy: newAgent.nameControlled.score(scAgent.nameLocal, 0.5)})
        }
      }

      return newAgent
    }
  } else if (scAgent && registryAgent) {
    // we have the registry agent if it already has a VIAF id then that means it was properly setup eariler so we just need to populate possibly new normalized values

    if (!registryAgent.viaf && viaf) {
      // the existing registry agent does not have VIAF data yet, we can populate what we know
      if (viaf.type) registryAgent.type = viaf.type.toLowerCase()
      registryAgent.viaf = viaf._id

      newAgent.viafAll = [viaf._id]

      if (viaf.wikidataId) registryAgent.wikidata = viaf.wikidataId
      if (viaf.lcId) registryAgent.lcId = viaf.lcId
      if (viaf.gettyId) registryAgent.ulan = parseInt(viaf.gettyId)
      if (viaf.dbpedia) registryAgent.dbpedia = viaf.dbpedia
      if (viaf.birth) registryAgent.birth = viaf.birth
      if (viaf.death) registryAgent.death = viaf.death

      if (viaf.lcTerm) {
        normal = normalize.normalizeAndDiacritics(viaf.lcTerm).trim()
        if (registryAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          registryAgent.nameNormalized.push(normal)
          registryAgent.altForms.push({name: viaf.lcTerm, type: 'viaf.lcTerm', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, viaf.lcTerm), fuzzy: newAgent.nameControlled.score(viaf.lcTerm, 0.5)})
        }
      }
      if (viaf.viafTerm) {
        normal = normalize.normalizeAndDiacritics(viaf.viafTerm).trim()
        if (registryAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          registryAgent.nameNormalized.push(normal)
          registryAgent.altForms.push({name: viaf.viafTerm, type: 'viaf.viafTerm', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, viaf.viafTerm), fuzzy: newAgent.nameControlled.score(viaf.viafTerm, 0.5)})
        }
      }
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (registryAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          registryAgent.nameNormalized.push(normal)
          registryAgent.altForms.push({name: viaf.nameLocal, type: 'viaf.nameLocal', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(newAgent.nameControlled, scAgent.nameLocal), fuzzy: newAgent.nameControlled.score(scAgent.nameLocal, 0.5)})
        }
      }

      return registryAgent
    } else if (registryAgent.viaf) {
      // it already has VIAF information just populate any new normalized names
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (registryAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          registryAgent.nameNormalized.push(normal)
          registryAgent.altForms.push({name: scAgent.nameLocal, type: 'scAgent.nameLocal', source: 'shadowcat', id: source, poverlap: normalize.percentOverlap(registryAgent.nameControlled, scAgent.nameLocal), fuzzy: registryAgent.nameControlled.score(scAgent.nameLocal, 0.5)})
        }
      }

      return registryAgent
    } else if (!registryAgent.viaf && !viaf) {
      // This is jsut a locally matched name, add in any new local normalized names
      if (scAgent.nameLocal) {
        normal = normalize.normalizeAndDiacritics(scAgent.nameLocal).trim()
        if (registryAgent.nameNormalized.indexOf(normal) === -1 && normal !== '') {
          registryAgent.nameNormalized.push(normal)
          registryAgent.altForms.push({name: scAgent.nameLocal, type: 'scAgent.nameLocal', source: 'shadowcat', id: source, poverlap: 100, fuzzy: 1})
        }
      }

      return registryAgent
    }
  }

  // if it got here we have problems
  db.logError('Agent Serialization - shadowcat - Could not serialize this agent!', JSON.stringify({ 'scAgent': scAgent, 'viaf': viaf, 'registryAgent': registryAgent }))

  return false
}
