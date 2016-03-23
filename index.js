'use strict'

function SerializeAgents () {
  /**
   *
   *
   * @param  {function} cb - Nothing returned
   */
  this.shadowcatSerializeViafAgents = require(`${__dirname}/lib/shadowcat_serialize_viaf_agents`)
}

module.exports = exports = new SerializeAgents()
