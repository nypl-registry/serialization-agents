'use strict'

function SerializeAgents () {
  /**
   * A cluster script the spawns workers to build registry agents from sc:agents that have a VIAF id
   *
   * @param  {function} cb - Nothing returned
   */
  this.shadowcatSerializeViafAgents = require(`${__dirname}/lib/shadowcat_serialize_viaf_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from sc:agents that do not have a VIAF
   *
   * @param  {function} cb - Nothing returned
   */
  this.shadowcatSerializeNonViafAgents = require(`${__dirname}/lib/shadowcat_serialize_non_viaf_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from agents in archives collections
   *
   * @param  {function} cb - Nothing returned
   */
  this.archivesSerializeCollectionAgents = require(`${__dirname}/lib/archives_serialize_collections_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from agents in archives components
   *
   * @param  {function} cb - Nothing returned
   */
  this.archivesSerializeComponentsAgents = require(`${__dirname}/lib/archives_serialize_components_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from agents in mms Collections
   *
   * @param  {function} cb - Nothing returned
   */
  this.mmsSerializeCollectionsAgents = require(`${__dirname}/lib/mms_serialize_collections_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from agents in mms Containers
   *
   * @param  {function} cb - Nothing returned
   */
  this.mmsSerializeContainerAgents = require(`${__dirname}/lib/mms_serialize_containers_agents`)
}

module.exports = exports = new SerializeAgents()
