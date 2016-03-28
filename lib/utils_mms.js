'use strict'
// var lexicon = require('nypl-registry-utils-lexicon')
// var db = require('nypl-registry-utils-database')
var _ = require('highland')
var utils = require('./utils')
var normalize = require('nypl-registry-utils-normalize')

/**
* Lookup all agents
*
* @param  {object} mmsObject - Includes an array of mmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInViaf = (mmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {}
  _(mmsObject['agents'])
    .map((agent) => {
      // extract the VIAF id from the full URI
      if (agent.valueURI && agent.valueURI.search('viaf.org') > -1) {
        agent.viaf = agent.valueURI.split('/viaf/')[1]
      } else {
        agent.viaf = false
      }
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
      mmsObject['agents'] = mmsObject['agents'].map((agent) => {
        if (agent.valueURI && agent.valueURI.search('viaf.org') > -1) {
          agent.viaf = agent.valueURI.split('/viaf/')[1]
        } else {
          agent.viaf = false
        }
        agent.viafOg = agent.viaf
        agent.viaf = lookup[agent.viaf]
        return agent
      })
      if (cb) cb(null, mmsObject)
    })
}
/**
* Lookup all agents by naf
*
* @param  {object} mmsObject - Includes an array of mmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInViafByNaf = (mmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {}
  _(mmsObject['agents'])
    .map((agent) => {
      // already got it
      if (agent.viaf) return ''
      // extract the VIAF id from the full URI
      if (agent.valueURI && agent.valueURI.search('id.loc.gov/authorities/names') > -1) {
        agent.lcId = agent.valueURI.split('/names/')[1]
      } else {
        agent.lcId = false
      }
      if (!agent.lcId) lookup[agent.lcId] = false
      if (lookup[agent.lcId]) return ''
      return agent.lcId
    })
    .compact()
    .map(_.curry(utils.returnViafDataByNaf))
    .nfcall([])
    .parallel(5)
    .map((results) => {
      lookup[results.id] = results.data
    })
    .done(() => {
      // backfill in the data
      mmsObject['agents'] = mmsObject['agents'].map((agent) => {
        if (agent.valueURI && agent.valueURI.search('id.loc.gov/authorities/names') > -1) {
          agent.lcId = agent.valueURI.split('/names/')[1]
        } else {
          agent.lcId = false
        }
        agent.viafOg = (lookup[agent.lcId]) ? lookup[agent.lcId].viaf[0] : false
        agent.viaf = lookup[agent.lcId]
        return agent
      })
      if (cb) cb(null, mmsObject)
    })
}

/**
* Lookup all agents in existing agents collection by normalized name
*
* @param  {object} mmsObject - Includes an array of mmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInRegistryAgentsByViaf = (mmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {false: false}

  _(mmsObject['agents'])
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
      mmsObject['agents'] = mmsObject['agents'].map((agent) => {
        agent.agent = lookup[agent.viafOg]
        return agent
      })
      if (cb) cb(null, mmsObject)
    })
}

/**
* Lookup all agents in existing agents collection by normalized name
*
* @param  {object} mmsObject - Includes an array of mmsObject.agents
* @param  {function} cb - callback
* @return {obj} viaf data -
*/
exports.lookupAgentsInRegistryAgentsByName = (mmsObject, cb) => {
  // builds a lookup of all the agents so we can save time if there are the same agent twice (contributor and subject for example)
  var lookup = {false: false}

  _(mmsObject['agents'])
    .map((agent) => {
      // take the viaf ID out of the viaf data and pass it on to the lookup
      if (lookup[agent.namePart]) return ''
      // we already matched with by viaf
      if (agent.agent) return ''
      return agent.namePart
    })
    .compact()
    .map(_.curry(utils.returnAgentByName))
    .nfcall([])
    .parallel(5)
    .map((results) => {
      // assing the results of the viaf search to our lookup
      lookup[results.name] = results.data
    })
    .done(() => {
      // backfill in the data
      mmsObject['agents'] = mmsObject['agents'].map((agent) => {
        if (!agent.agent) agent.agent = lookup[agent.namePart]
        return agent
      })
      if (cb) cb(null, mmsObject)
    })
}

// /**
// * Creating an agent it needs to merge the source information (archives data) with any VIAF data we have on had and a existing registry agent if it exists
// *
// * @param  {obj} agent - an object that contains the archives data, viaf lookup data, registry agent data and record source identifier
// * @return {obj} viaf data -
// */
exports.buildAgentFromMmsAgent = function (archiveAgent) {
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
    source: archiveAgent.source,
    nameNormalized: [],
    fast: []
  }

  if (archiveAgent.viaf) {
    newAgent.viaf = archiveAgent.viaf.viaf
    if (archiveAgent.viaf.namePart) newAgent.nameControlled = archiveAgent.viaf.namePart
    if (archiveAgent.viaf.viafTerm) newAgent.nameControlled = archiveAgent.viaf.viafTerm
    if (archiveAgent.viaf.lcTerm) newAgent.nameControlled = archiveAgent.viaf.lcTerm
    newAgent.type = archiveAgent.viaf.type.toLowerCase()
    if (archiveAgent.viaf.wikidata) newAgent.wikidata = archiveAgent.viaf.wikidata
    if (archiveAgent.viaf.lcId) newAgent.lcId = archiveAgent.viaf.lcId
    if (archiveAgent.viaf.gettyId) newAgent.gettyId = archiveAgent.viaf.gettyId
    if (archiveAgent.viaf.birth) newAgent.birth = archiveAgent.viaf.birth
    if (archiveAgent.viaf.death) newAgent.death = archiveAgent.viaf.death
    if (archiveAgent.viaf.dbpediaId) newAgent.dbpediaId = archiveAgent.viaf.dbpediaId
    if (archiveAgent.viaf.fast) newAgent.fast = archiveAgent.viaf.fast
    if (archiveAgent.viaf.normalized) newAgent.nameNormalized = archiveAgent.viaf.normalized
    if (newAgent.nameNormalized.indexOf(normalize.normalizeAndDiacritics(archiveAgent.namePart)) === -1) {
      // add the normalized
      newAgent.nameNormalized.push(normalize.normalizeAndDiacritics(archiveAgent.namePart))
      // and the alt form
      newAgent.altForms.push({
        'name': archiveAgent.namePart,
        'type': 'mms.namePart',
        'source': archiveAgent.source.source,
        'id': archiveAgent.source.id,
        'poverlap': normalize.percentOverlap(newAgent.nameControlled, archiveAgent.namePart),
        'fuzzy': newAgent.nameControlled.score(archiveAgent.namePart, 0.5)
      })
    }
  } else {
    newAgent.viaf = 'noViaf' + Date.now() + Math.floor(Math.random() * (1000000 - 1)) + 1
    newAgent.nameControlled = archiveAgent.namePart
    newAgent.type = archiveAgent.type
    newAgent.nameNormalized = [normalize.normalizeAndDiacritics(archiveAgent.namePart)]
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
exports.updateMmsAgentsByViaf = (agents, cb) => {
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
exports.updateMmsAgentsByName = (agents, cb) => {
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
