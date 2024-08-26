const _ = require('lodash')
const {entities, getRootDomain, getEntity} = require('./index.js')

describe('Entities', () => {
  it('should not have duplicate names', () => {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const nameA = entities[i].name.replace(/\s+/, '').toLowerCase()
        const nameB = entities[j].name.replace(/\s+/, '').toLowerCase()
        if (nameA !== nameB) continue

        expect(entities[i]).toBe(entities[j])
      }
    }
  })

  it('should not have non-supported wilcards', () => {
    for (const entity of entities) {
      for (const domain of entity.domains) {
        // Wildcards must be like `*.blah.com`
        // Wildcards cannot be `*blah.com` or `blah*.com`
        expect(domain).toEqual(expect.not.stringMatching(/\w\*/))
        expect(domain).toEqual(expect.not.stringMatching(/\*\w/))
      }
    }
  })
})
