const tape = require('tape')
const FIFO = require('./')

tape('basic', function (t) {
  const q = new FIFO()
  const values = [
    1,
    4,
    4,
    0,
    null,
    {},
    Math.random(),
    '',
    'hello',
    9,
    1,
    4,
    5,
    6,
    7,
    null,
    null,
    0,
    0,
    15,
    52.2,
    null
  ]

  t.same(q.shift(), undefined)
  t.ok(q.isEmpty())
  t.equal(q.length, 0)
  for (const value of values) q.push(value)
  while (!q.isEmpty()) {
    t.same(q.shift(), values.shift())
    t.equal(q.length, values.length)
  }
  t.same(q.shift(), undefined)
  t.ok(q.isEmpty())
  t.end()
})

tape('long length', function (t) {
  const q = new FIFO()

  const len = 0x8f7
  for (let i = 0; i < len; i++) q.push(i)

  t.same(q.length, len)

  let shifts = 0
  while (!q.isEmpty()) {
    q.shift()
    shifts++
  }

  t.same(shifts, len)
  t.same(q.length, 0)

  t.end()
})
