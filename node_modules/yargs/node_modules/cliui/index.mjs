// Bootstrap cliui with CommonJS dependencies:
import { cliui } from './build/lib/index.js'
import stringWidth from 'string-width'
import stripAnsi from 'strip-ansi'
import wrapAnsi from 'wrap-ansi'

export default function ui (opts) {
  return cliui(opts, {
    stringWidth,
    stripAnsi,
    wrap: wrapAnsi
  })
}

export {ui as 'module.exports'};
