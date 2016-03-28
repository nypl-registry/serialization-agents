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
}

module.exports = exports = new SerializeAgents()
