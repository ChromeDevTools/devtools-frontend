const test = require('brittle')
const FIFO = require('./')

test('basic', function (t) {
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

  t.is(q.shift(), undefined)
  t.ok(q.isEmpty())
  t.is(q.length, 0)
  for (const value of values) q.push(value)
  while (!q.isEmpty()) {
    t.is(q.shift(), values.shift())
    t.is(q.length, values.length)
  }
  t.is(q.shift(), undefined)
  t.ok(q.isEmpty())
})

test('long length', function (t) {
  const q = new FIFO()

  const len = 0x8f7
  for (let i = 0; i < len; i++) q.push(i)

  t.is(q.length, len)

  let shifts = 0
  while (!q.isEmpty()) {
    q.shift()
    shifts++
  }

  t.is(shifts, len)
  t.is(q.length, 0)
})

test('clear', function (t) {
  const q = new FIFO()

  q.push('a')
  q.push('a')
  q.clear()
  t.is(q.shift(), undefined)
  t.is(q.length, 0)

  for (let i = 0; i < 50; i++) {
    q.push('a')
  }

  q.clear()
  t.is(q.shift(), undefined)
  t.is(q.length, 0)
})

test('basic length', function (t) {
  const q = new FIFO()

  q.push('a')
  t.is(q.length, 1)

  q.push('a')
  t.is(q.length, 2)

  q.shift()
  t.is(q.length, 1)

  q.shift()
  t.is(q.length, 0)

  q.shift()
  t.is(q.length, 0)
})

test('peek', function (t) {
  const q = new FIFO()

  q.push('a')
  t.is(q.length, 1)
  t.is(q.peek(), 'a')
  t.is(q.peek(), 'a')

  q.push('b')
  t.is(q.length, 2)
  t.is(q.peek(), 'a')
  t.is(q.peek(), 'a')

  t.is(q.shift(), 'a')
  t.is(q.peek(), 'b')
  t.is(q.peek(), 'b')

  t.is(q.shift(), 'b')
  t.is(q.peek(), undefined)
  t.is(q.peek(), undefined)
})

test('invalid hwm', function (t) {
  t.exception(() => new FIFO(3))
})
