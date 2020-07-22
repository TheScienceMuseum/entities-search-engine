{ host:elasticHost, index } = require('config').elastic

got = require 'got'

{ buildDocUrl, formatEntity } = require './entity'

module.exports = (type, entities)->
  batch = []
  entities.forEach appendEntity(type, batch)
  # It is required to end by a newline break
  body = batch.join('\n') + '\n'
  headers =  { 'Content-Type': 'application/json' }
  got.post "#{elasticHost}/_bulk", { body, headers }

# see: https://www.elastic.co/guide/en/elasticsearch/guide/current/bulk.html
appendEntity = (type, batch)-> (entity)->
  batch.push metaDataLine(type, entity.id)
  batch.push JSON.stringify(formatEntity(entity))

metaDataLine = (type, id)->
  "{\"index\":{\"_index\":\"#{index}\",\"_type\":\"#{type}\",\"_id\":\"#{id}\"}}"
