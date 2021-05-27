'use strict'

const rollup = require('rollup').rollup
const minifyHTML = require('..')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')

process.chdir(__dirname)

const concat = (name, subdir) => {
  let filePath = path.join(__dirname, subdir, name)
  filePath = filePath.replace(/\\/g, '/')
  if (!path.extname(filePath)) filePath += '.js'
  return filePath
}

const test = (done, file, pluginOpts = {}) => {
  const filePath = concat(file, 'fixtures')
  const expected = fs.readFileSync(concat(file, 'expected'), 'utf8')
  ;(async () => {
    try {
      const bundle = await rollup({
        input: filePath,
        plugins: [minifyHTML(pluginOpts)]
      })
      const output = await bundle.generate({ format: 'es' })
      const code = output.output[0].code
      expect(code).to.equal(expected)
      done()
    } catch (err) {
      done(err)
    }
  })()
}

describe('rollup-plugin-minify-html-template-literals', () => {
  it('works for me', done => {
    test(done, 'default')
  })
  it('excludes what i hate', done => {
    test(done, 'filter', { exclude: 'fixtures/exclude.js' })
  })
})
