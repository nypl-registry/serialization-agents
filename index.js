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

  /**
   * A cluster script the spawns workers to build registry agents from agents in mms Items
   *
   * @param  {function} cb - Nothing returned
   */
  this.mmsSerializeItemsAgents = require(`${__dirname}/lib/mms_serialize_items_agents`)

  /**
   * A cluster script the spawns workers to build registry agents from agents in TMS objects
   *
   * @param  {function} cb - Nothing returned
   */
  this.tmsSerializeObjectsAgents = require(`${__dirname}/lib/tms_serialize_objects_agents`)

  /**
   * A cluster script the spawns workers to assign sequential numeric ids to all the agents
   *
   * @param  {function} cb - Nothing returned
   */
  this.enumerateAgents = require(`${__dirname}/lib/enumerate_agents`)

  /**
   * Prepare the agents able and do anything we need to do before we start the serialization
   *
   * @param  {function} cb - Nothing returned
   */
  this.prepareAgents = require(`${__dirname}/lib/prepare`)
}

module.exports = exports = new SerializeAgents()
