"use strict"

const path = require("path")
const run = require("test262-parser-runner")
const acorn = require("acorn")
const Parser = acorn.Parser.extend(require("."))

const unsupportedFeatures = [
  "class-fields-private",
  "class-fields-public",
  "class-methods-private",
  "class-static-fields-private",
  "class-static-fields-public",
  "class-static-methods-private",
]

run(
  (content, options) => Parser.parse(content, {sourceType: options.sourceType, ecmaVersion: 11}),
  {
    testsDirectory: path.dirname(require.resolve("test262/package.json")),
    skip: test => (!test.attrs.features || !test.attrs.features.includes("numeric-separator-literal") || unsupportedFeatures.some(f => test.attrs.features.includes(f))),
  }
)
