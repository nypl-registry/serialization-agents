'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
// var db = require('nypl-registry-utils-database')
var _ = require('highland')
var utils = require('./utils')
var normalize = require('nypl-registry-utils-normalize')

/**
* Lookup all agents
*
* @param  {object} tmsObject - Includes an array of tmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInViaf = (tmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {}
  _(tmsObject['agents'])
    .map((agent) => {
      if (!agent.viaf) lookup[agent.viaf] = false
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
      tmsObject['agents'] = tmsObject['agents'].map((agent) => {
        agent.viafOg = (agent.viaf) ? agent.viaf : false
        agent.viaf = lookup[agent.viaf]
        return agent
      })
      if (cb) cb(null, tmsObject)
    })
}
/**
* Lookup all agents in existing agents collection by normalized name
*
* @param  {object} tmsObject - Includes an array of tmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInRegistryAgentsByViaf = (tmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {false: false}

  _(tmsObject['agents'])
    .map((agent) => {
      // take the viaf ID out of the viaf data and pass it on to the lookup
      if (lookup[agent.viafOg]) return ''
      return agent.viafOg
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
      tmsObject['agents'] = tmsObject['agents'].map((agent) => {
        agent.agent = lookup[agent.viafOg]
        return agent
      })
      if (cb) cb(null, tmsObject)
    })
}

/**
* Lookup all agents in existing agents collection by normalized name
*
* @param  {object} tmsObject - Includes an array of tmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInRegistryAgentsByName = (tmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {false: false}

  // put all those names into a big array and check each one against the regsitry
  var allNames = []
  tmsObject['agents'].forEach((agent) => {
    if (agent.viaf) return
    agent.checkNames.forEach((name) => allNames.push(name))
  })

  _(allNames)
    .map(_.curry(utils.returnAgentByName))
    .nfcall([])
    .parallel(5)
    .map((results) => {
      // assing the results of the viaf search to our lookup
      lookup[results.name] = results.data
    })
    .done(() => {
      // backfill in the data
      tmsObject['agents'] = tmsObject['agents'].map((agent) => {
        for (var x in lookup) {
          if (agent.checkNames.indexOf(x) > -1) {
            if (!agent.agent) {
              agent.agent = lookup[x]
            }
          }
        }
        return agent
      })
      if (cb) cb(null, tmsObject)
    })
}

// /**
// * Creating an agent it needs to merge the source information (archives data) with any VIAF data we have on had and a existing registry agent if it exists
// *
// * @param  {obj} agent - an object that contains the archives data, viaf lookup data, registry agent data and record source identifier
// * @return {obj} viaf data -
// */
exports.buildAgentFromTmsAgent = function (tmsAgent) {
  var newAgent = {
    viaf: false,
    registry: 'temp' + Date.now() + Math.floor(Math.random() * (1000000 - 1)) + 1,
    nameControlled: false,
    wikidata: false,
    lcId: false,
    gettyId: false,
    dbpedia: false,
    birth: false,
    death: false,
    type: false,
    altForms: [],
    source: tmsAgent.source,
    nameNormalized: [],
    fast: []
  }
  // the first constructed name id the best
  if (tmsAgent.checkNames[0]) tmsAgent.namePart = tmsAgent.checkNames[0]
  if (!tmsAgent.namePart) tmsAgent.namePart = tmsAgent.nameAlpha

  // TODO make this better
  tmsAgent.type = 'personal'
  if (tmsAgent.namePart.search('&') > -1) tmsAgent.type = 'corporate'

  if (tmsAgent.viaf) {
    newAgent.viaf = tmsAgent.viaf.viaf
    if (tmsAgent.viaf.namePart) newAgent.nameControlled = tmsAgent.viaf.namePart
    if (tmsAgent.viaf.viafTerm) newAgent.nameControlled = tmsAgent.viaf.viafTerm
    if (tmsAgent.viaf.lcTerm) newAgent.nameControlled = tmsAgent.viaf.lcTerm
    newAgent.type = tmsAgent.viaf.type.toLowerCase()
    if (tmsAgent.viaf.wikidata) newAgent.wikidata = tmsAgent.viaf.wikidata
    if (tmsAgent.viaf.lcId) newAgent.lcId = tmsAgent.viaf.lcId
    if (tmsAgent.viaf.gettyId) newAgent.gettyId = tmsAgent.viaf.gettyId
    if (tmsAgent.viaf.birth) newAgent.birth = tmsAgent.viaf.birth
    if (tmsAgent.viaf.death) newAgent.death = tmsAgent.viaf.death
    if (tmsAgent.viaf.dbpediaId) newAgent.dbpediaId = tmsAgent.viaf.dbpediaId
    if (tmsAgent.viaf.fast) newAgent.fast = tmsAgent.viaf.fast
    if (tmsAgent.viaf.normalized) newAgent.nameNormalized = tmsAgent.viaf.normalized
    if (newAgent.nameNormalized.indexOf(normalize.normalizeAndDiacritics(tmsAgent.namePart)) === -1) {
      // add the normalized
      newAgent.nameNormalized.push(normalize.normalizeAndDiacritics(tmsAgent.namePart))
      // and the alt form
      newAgent.altForms.push({
        'name': tmsAgent.namePart,
        'type': 'tms.nameAlpha',
        'source': tmsAgent.source.source,
        'id': tmsAgent.source.id,
        'poverlap': normalize.percentOverlap(newAgent.nameControlled, tmsAgent.namePart),
        'fuzzy': newAgent.nameControlled.score(tmsAgent.namePart, 0.5)
      })
    }
  } else {
    newAgent.viaf = 'noViaf' + Date.now() + Math.floor(Math.random() * (1000000 - 1)) + 1
    newAgent.nameControlled = tmsAgent.namePart
    newAgent.type = tmsAgent.type
    newAgent.nameNormalized = [normalize.normalizeAndDiacritics(tmsAgent.namePart)]
    if (tmsAgent.dateStart) newAgent.birth = tmsAgent.dateStart
    if (tmsAgent.dateEnd) newAgent.death = tmsAgent.dateEnd
  }
  return newAgent
}

/**
* loop through all the agents to be updated by viaf
*
* @param  {array} agents - Array of 'agents'
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.updateTmsAgentsByViaf = (agents, cb) => {
  _(agents)
    .map((agent) => (typeof agent.viaf === 'string') ? '' : agent)
    .compact()
    .map(_.curry(utils.addAgentByViaf))
    .nfcall([])
    .parallel(5)
    .done(() => {
      if (cb) cb(null, agents)
    })
}

/**
* loop through all the agents to be updated by name
*
* @param  {array} agents - Array of 'agents'
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.updateTmsAgentsByName = (agents, cb) => {
  _(agents)
    .map((agent) => (Array.isArray(agent.viaf)) ? '' : agent)
    .compact()
    .map(_.curry(utils.addAgentByName))
    .nfcall([])
    .parallel(5)
    .done(() => {
      if (cb) cb(null, agents)
    })
}
