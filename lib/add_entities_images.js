const { get } = require('./request')
const { host: invHost } = require('config').inventaire
const { getEntityUri, getEntityId } = require('./helpers')

// Assumes that entities in a batch are all from the same domain
const batchLengthPerDomain = {
  inv: 100,
  // Add images of Wikidata entities with small batches as each request might need a SPARQL request
  // which is rate limited to 5 request at once
  wd: 3
}

module.exports = entities => {
  let uris
  if (entities instanceof Array) {
    uris = entities.map(getEntityUri)
    entities = indexById(entities)
  } else {
    uris = Object.values(entities).map(getEntityUri)
  }

  if (uris.length === 0) return Promise.resolve(entities)

  const domain = uris[0].split(':')[0]
  const batchLength = batchLengthPerDomain[domain]

  const addImageToNextEntityBatch = () => {
    const urisBatch = uris.splice(0, batchLength)

    // When there is no more URIs,
    // return the updated entities as final results
    if (urisBatch.length === 0) return entities

    return get(`${invHost}/api/entities?action=images&uris=${urisBatch.join('|')}`)
    .then(res => res.json())
    .then(({ images }) => {
      for (const uri in images) {
        // Working around the difference between Wikidata that returns entities
        // indexed by Wikidata id and Inventaire that index by URIs
        const entityImages = images[uri]
        const id = uri.split(':')[1]
        const entity = entities[id] || entities[uri]

        // Case where we can't find the entity: it was redirected in the meantime
        if (entity != null) {
          entity.images = entityImages
        }
      }
    })
    .then(addImageToNextEntityBatch)
  }

  return addImageToNextEntityBatch()
}

const indexById = entities => {
  const index = {}
  entities.forEach(entity => {
    const id = getEntityId(entity)
    index[id] = entity
  })
  return index
}
