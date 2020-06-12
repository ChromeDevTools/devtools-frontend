"use strict"

const path = require("path")
const run = require("test262-parser-runner")
const acorn = require("acorn")
const logicalAssignments = require(".")
const Parser = acorn.Parser.extend(logicalAssignments)

const unsupportedFeatures = [
  "class-fields-private",
  "class-fields-public",
  "class-static-fields-public",
  "class-static-fields-private",
  "class-static-methods-private"
]

const implementedFeatures = [
  "logical-assignment-operators"
]

run(
  (content, options) => Parser.parse(content, {sourceType: options.sourceType, ecmaVersion: 11}),
  {
    testsDirectory: path.dirname(require.resolve("test262/package.json")),
    skip: test => (!test.attrs.features || !implementedFeatures.some(f => test.attrs.features.includes(f)) || unsupportedFeatures.some(f => test.attrs.features.includes(f))),
    whitelist: []
  }
)
