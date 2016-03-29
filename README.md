# serialization-agents
[![travis](https://travis-ci.org/nypl-registry/serialization-agents.svg)](https://travis-ci.org/nypl-registry/serialization-agents/)

Aggregates agents from sources systems and serializes them into lookup table and triple store.



####lib/utils
Basic methods for looking up agents in viaf lookup table and agents ingest table

####lib/utils_shadowcat
Methods specific to looking up/building agent model from shadowcat `'sc:agents'` field

####lib/utils_archives
Methods specific to looking up/building agent model from archives `'agents'` field

####lib/utils_mms
Methods specific to looking up/building agent model from MMS `'agents'` field


####lib/shadowcat_serialize_viaf_agents (cluster)
`shadowcatSerializeViafAgents` - Builds/merges agents in shadowcat that were mapped to a VIAF identifier.	(should run 1st)

####lib/shadowcat_serialize_non_viaf_agents (cluster)
`shadowcatSerializeNonViafAgents` - Builds/merges agents in shadowcat that were not mapped to a VIAF id. This process runs after the VIAF to allow matching of alt forms to controlled terms already in the agents collection. (should run 2nd)

####lib/archives_serialize_collections_agents (cluster)
`archivesSerializeCollectionAgents` - Creates agents in registry ingest for agents at the archival collection level. (should run 3rd)

####lib/archives_serialize_components_agents (cluster)
`archivesSerializeCollectionAgents` - Creates agents in registry ingest for agents at the archival components level. (should run 4th)

####lib/mms_serialize_collections_agents (cluster)
`mmsSerializeCollectionsAgents` - Creates agents in registry ingest for agents found in MMS collections. (should run 5th)

####lib/mms_serialize_containers_agents (cluster)
`mmsSerializeCollectionsAgents` - Creates agents in registry ingest for agents found in MMS containers. (should run 6th)

####lib/mms_serialize_items_agents (cluster)
`mmsSerializeCollectionsAgents` - Creates agents in registry ingest for items found in MMS containers. (should run 7th)

####lib/tms_serialize_items_agents (cluster)
`tmsSerializeObjectsAgents` - Creates agents in registry ingest for items found in TMS objects. (should run 8th)

####lib/enumerate_agents (cluster)
`enumerateAgents` - Loops through all the agents in the lookup collection and populates a sequential registry ID. (should run last) This is where agent persistance will need to be built in.