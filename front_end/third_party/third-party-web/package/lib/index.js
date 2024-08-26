const {createAPIFromDataset} = require('./create-entity-finder-api.js')
const entities = require('../dist/entities.json')
module.exports = createAPIFromDataset(entities)
