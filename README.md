# serialization-agents
[![travis](https://travis-ci.org/nypl-registry/serialization-agents.svg)](https://travis-ci.org/nypl-registry/serialization-agents/)

Aggregates agents from sources systems and serializes them into lookup table and triple store.



####lib/utils
Basic methods for looking up agents in viaf lookup table and agents ingest table

####lib/utils_shadowcat
Methods specific to looking up/building agent model from shadowcat `'sc:agents'` field

####lib/utils_archives
Methods specific to looking up/building agent model from archives `'agents'` field


####lib/shadowcat_serialize_viaf_agents (cluster)
`shadowcatSerializeViafAgents` - Builds/merges agents in shadowcat that were mapped to a VIAF identifier.	(should run 1st)

####lib/shadowcat_serialize_non_viaf_agents (cluster)
`shadowcatSerializeNonViafAgents` - Builds/merges agents in shadowcat that were not mapped to a VIAF id. This process runs after the VIAF to allow matching of alt forms to controlled terms already in the agents collection. (should run 2nd)

####lib/archives_serialize_collections_agents (cluster)
`archivesSerializeCollectionAgents` - Creates agents in registry ingest for agents at the archival collection level. (should run 3rd)