const {createAPIFromDataset} = require('../create-entity-finder-api.js')
const entities = require('../../dist/entities-httparchive-nostats.json')
module.exports = createAPIFromDataset(entities)
