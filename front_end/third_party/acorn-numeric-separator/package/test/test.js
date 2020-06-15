"use strict"

const assert = require("assert")
const acorn = require("acorn")
const numericSeparator = require("..")
const Parser = acorn.Parser.extend(numericSeparator)

function test(text, expectedResult, additionalOptions) {
  it(text, function () {
    const result = Parser.parse(text, Object.assign({ ecmaVersion: 9, plugins: { numericSeparator: true } }, additionalOptions))
    assert.deepStrictEqual(result.body[0], expectedResult)
  })
}
function testFail(text, expectedError, additionalOptions) {
  it(text, function () {
    let failed = false
    try {
      Parser.parse(text, Object.assign({ ecmaVersion: 9, plugins: { numericSeparator: true } }, additionalOptions))
    } catch (e) {
      assert.strictEqual(e.message, expectedError)
      failed = true
    }
    assert(failed)
  })
}

const newNode = (start, props) => Object.assign(new acorn.Node({options: {}}, start), props)

describe("acorn-numeric-separator", function () {
  testFail("'\\u{12_34}'", "Bad character escape sequence (1:4)")
  testFail("'\\u12_34'", "Bad character escape sequence (1:3)")
  testFail("let a\\u{12_34} = 5", "Bad character escape sequence (1:8)")

  const digits = [
    {d: "1_0", ast: start => newNode(start, {
      type: "Literal",
      end: start + 3,
      value: 10,
      raw: "1_0",
    })},
    {d: "12e3_4", ast: start => newNode(start, {
      type: "Literal",
      end: start + 6,
      value: 12e34,
      raw: "12e3_4",
    })},
    {d: "1_2e34", ast: start => newNode(start, {
      type: "Literal",
      end: start + 6,
      value: 12e34,
      raw: "1_2e34",
    })},
    {d: "0b1010_1001", ast: start => newNode(start, {
      type: "Literal",
      end: start + 11,
      value: 169,
      raw: "0b1010_1001",
    })},
    {d: "0xA0_B0_C0", ast: start => newNode(start, {
      type: "Literal",
      end: start + 10,
      value: 0xa0b0c0,
      raw: "0xA0_B0_C0",
    })},
    {d: "0o70_60_50", ast: start => newNode(start, {
      type: "Literal",
      end: start + 10,
      value: 0o706050,
      raw: "0o70_60_50",
    })},

    {d: "_2", ast: start => newNode(start, {
      type: "Identifier",
      end: start + 2,
      name: "_2",
    })},
    {d: "0b_1", error: start => `Invalid numeric separator (1:${start + 2})`},
    {d: "0o_1", error: start => `Invalid numeric separator (1:${start + 2})`},
    {d: "0x_1", error: start => `Invalid numeric separator (1:${start + 2})`},
    {d: "2_", error: start => `Invalid numeric separator (1:${start + 1})`},
    {d: "2__4", error: start => `Invalid numeric separator (1:${start + 2})`},
    {d: "._4", error: start => `Unexpected token (1:${start})`},
    {d: "_.4", error: start => `Unexpected token (1:${start + 1})`},
    {d: "1._4", error: start => `Invalid numeric separator (1:${start + 2})`},
    {d: "1_.4", error: start => `Invalid numeric separator (1:${start + 1})`},
    {d: "_1.4", error: start => `Unexpected token (1:${start + 2})`},
    {d: "1.4_", error: start => `Invalid numeric separator (1:${start + 3})`},
    {d: "1.4_e2", error: start => `Invalid numeric separator (1:${start + 3})`},
    {d: "1.4e_2", error: start => `Invalid numeric separator (1:${start + 4})`},
    {d: "04_3_2", error: start => `Invalid number (1:${start})`},
    {d: "0_4_3_2", error: start => `Invalid number (1:${start})`},
  ]
  const statements = [
    {s: "let i = %s", ast: content => newNode(0, {
      type: "VariableDeclaration",
      end: content.end,
      kind: "let",
      declarations: [newNode(4, {
        type: "VariableDeclarator",
        end: content.end,
        id: newNode(4, {
          type: "Identifier",
          end: 5,
          name: "i"
        }),
        init: content
      })]
    })},

    {s: "i = %s", ast: content => newNode(0, {
      type: "ExpressionStatement",
      end: content.end,
      expression: newNode(0, {
        type: "AssignmentExpression",
        end: content.end,
        operator: "=",
        left: newNode(0, {
          type: "Identifier",
          end: 1,
          name: "i"
        }),
        right: content
      })
    })},

    {s: "((i = %s) => {})", ast: content => newNode(0, {
      type: "ExpressionStatement",
      end: content.end + 8,
      expression: newNode(1, {
        type: "ArrowFunctionExpression",
        end: content.end + 7,
        id: null,
        generator: false,
        expression: false,
        async: false,
        params: [
          newNode(2, {
            type: "AssignmentPattern",
            end: content.end,
            left: newNode(2, {
              type: "Identifier",
              end: 3,
              name: "i"
            }),
            right: content
          })
        ],
        body: newNode(content.end + 5, {
          type: "BlockStatement",
          end: content.end + 7,
          body: []
        })
      })
    })},

    {s: "for (let i = 10; i < %s;++i) {}", ast: content => newNode(0, {
      type: "ForStatement",
      end: content.end + 8,
      init: newNode(5, {
        type: "VariableDeclaration",
        end: 15,
        declarations: [
          newNode(9, {
            type: "VariableDeclarator",
            end: 15,
            id: newNode(9, {
              type: "Identifier",
              end: 10,
              name: "i"
            }),
            init: newNode(13, {
              type: "Literal",
              end: 15,
              value: 10,
              raw: "10"
            })
          })
        ],
        kind: "let"
      }),
      test: newNode(17, {
        type: "BinaryExpression",
        end: content.end,
        left: newNode(17, {
          type: "Identifier",
          end: 18,
          name: "i"
        }),
        operator: "<",
        right: content
      }),
      update: newNode(content.end + 1, {
        type: "UpdateExpression",
        end: content.end + 4,
        operator: "++",
        prefix: true,
        argument: newNode(content.end + 3, {
          type: "Identifier",
          end: content.end + 4,
          name: "i"
        })
      }),
      body: newNode(content.end + 6, {
        type: "BlockStatement",
        end: content.end + 8,
        body: []
      })
    })},

    {s: "i + %s", ast: content => newNode(0, {
      type: "ExpressionStatement",
      end: content.end,
      expression: newNode(0, {
        type: "BinaryExpression",
        end: content.end,
        left: newNode(0, {
          type: "Identifier",
          end: 1,
          name: "i"
        }),
        operator: "+",
        right: content
      })
    })}
  ]
  statements.forEach(statement => {
    const start = statement.s.indexOf("%s")
    digits.forEach(d => {
      (d.error ? testFail : test)(
        statement.s.replace("%s", d.d),
        d.error ? d.error(start) : statement.ast(d.ast(start))
      )
    })
  })

  // Make sure we didn't break anything
  test("123..toString(10)", newNode(0, {
    type: "ExpressionStatement",
    end: 17,
    expression: newNode(0, {
      type: "CallExpression",
      end: 17,
      callee: newNode(0, {
        type: "MemberExpression",
        end: 13,
        object: newNode(0, {
          type: "Literal",
          end: 4,
          raw: "123.",
          value: 123
        }),
        property: newNode(5, {
          type: "Identifier",
          end: 13,
          name: "toString"
        }),
        computed: false,
      }),
      arguments: [
        newNode(14, {
          type: "Literal",
          start: 14,
          end: 16,
          raw: "10",
          value: 10
        })
      ],
    })
  }))
  testFail("08_0;", "Invalid number (1:0)")
})
