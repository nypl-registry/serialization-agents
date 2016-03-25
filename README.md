# serialization-agents
[![travis](https://travis-ci.org/nypl-registry/serialization-agents.svg)](https://travis-ci.org/nypl-registry/serialization-agents/)

Aggregates agents from sources systems and serializes them into lookup table and triple store.



####lib/utils.js
Basic methods for looking up agents in viaf lookup table and agents ingest table

####lib/utils_shadowcat.js
Methods specific to looking up/building agent model from shadowcat `'sc:agents'` field

`shadowcatSerializeViafAgents` - Builds/merges agents in shadowcat that were mapped to a VIAF identifier.	

`removeViafFromShadowcatAgent` - If a VIAF id is not valid (deleted cluster, not lcnaf useInstead) we will set the 'sc:agents'.viaf to false so it can be processed in the uncontrolled workflow.