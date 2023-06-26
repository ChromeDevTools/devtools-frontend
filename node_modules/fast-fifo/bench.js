const FastFIFO = require('./')
const FIFO = require('fifo')

run(new FIFO(), 'fifo')
run(new FastFIFO(), 'fast-fifo')
run(new FIFO(), 'fifo')
run(new FastFIFO(), 'fast-fifo')

function run (q, prefix) {
  const runs = 1024

  console.time(prefix + ' bulk push and shift')

  for (let j = 0; j < 1e5; j++) {
    for (let i = 0; i < runs; i++) {
      q.push(i)
    }
    for (let i = 0; i < runs; i++) {
      q.shift()
    }
  }

  console.timeEnd(prefix + ' bulk push and shift')
  console.time(prefix + ' individual push and shift')

  for (let j = 0; j < 1e5; j++) {
    for (let i = 0; i < runs; i++) {
      q.push(i)
      q.shift()
    }
  }

  console.timeEnd(prefix + ' individual push and shift')
}
