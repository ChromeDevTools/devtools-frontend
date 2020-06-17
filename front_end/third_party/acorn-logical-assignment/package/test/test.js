"use strict"

const assert = require("assert")
const acorn = require("acorn")
const logicalAssignments = require("..")
const Parser = acorn.Parser.extend(logicalAssignments)

function test(text, expectedResult, additionalOptions) {
  it(text, function () {
    const result = Parser.parse(text, Object.assign({ ecmaVersion: 11 }, additionalOptions))
    if (expectedResult) {
      assert.deepStrictEqual(result.body[0], expectedResult)
    }
  })
}
function testFail(text, expectedError, additionalOptions) {
  it(text, function () {
    let failed = false
    try {
      Parser.parse(text, Object.assign({ ecmaVersion: 11 }, additionalOptions))
    } catch (e) {
      assert.strictEqual(e.message, expectedError)
      failed = true
    }
    assert(failed)
  })
}

const newNode = (start, props) => Object.assign(new acorn.Node({options: {}}, start), props)

describe("acorn-logical-assignment", function () {
  const lhs = [
    {d: "x", ast: start => newNode(start, {
      type: "Identifier",
      start: 0,
      end: 1,
      name: "x"
    })},
    {d: "x.y", ast: start => newNode(start, {
      type: "MemberExpression",
      start: 0,
      end: 3,
      object: newNode(0, {
        type: "Identifier",
        start: 0,
        end: 1,
        name: "x"
      }),
      optional: false,
      property: newNode(0, {
        type: "Identifier",
        start: 2,
        end: 3,
        name: "y"
      }),
      computed: false
    })},
    {d: "var x", error: "Unexpected token (1:5)"},
    {d: "{ x }", error: "Unexpected token (1:5)"},
    {d: "() => {}", error: "Assigning to rvalue (1:0)"},
    {d: "'use strict'; arguments", error: "Assigning to arguments in strict mode (1:14)"},
    {d: "/x/", error: "Assigning to rvalue (1:0)"},
  ]
  const getRight = start => newNode(start, {
    type: "Identifier",
    start: start,
    end: start + 1,
    name: "x"
  })
  const ops = [
    {s: "&&=", ast: content => newNode(0, {
      type: "ExpressionStatement",
      start: 0,
      end: content.end + 4,
      expression: newNode(0, {
        type: "AssignmentExpression",
        start: 0,
        end: content.end + 4,
        operator: "&&=",
        left: content,
        right: getRight(content.end + 3)
      })
    })},
    {s: "||=", ast: content => newNode(0, {
      type: "ExpressionStatement",
      start: 0,
      end: content.end + 4,
      expression: newNode(0, {
        type: "AssignmentExpression",
        start: 0,
        end: content.end + 4,
        operator: "||=",
        left: content,
        right: getRight(content.end + 3)
      })
    })},
    {s: "??=", ast: content => newNode(0, {
      type: "ExpressionStatement",
      start: 0,
      end: content.end + 4,
      expression: newNode(0, {
        type: "AssignmentExpression",
        start: 0,
        end: content.end + 4,
        operator: "??=",
        left: content,
        right: getRight(content.end + 3)
      })
    })},
  ]
  ops.forEach(op => {
    lhs.forEach(d => {
      (d.error ? testFail : test)(
        `${d.d}${op.s}x`,
        d.error || op.ast(d.ast(0))
      )
    })
  })
  test(`let count = 0;
    const obj = {a: true};
    while (obj?.a) {
      count++;
      break;
    }
    assert.sameValue(1, count);
  `)
})
