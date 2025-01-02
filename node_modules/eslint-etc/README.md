# eslint-etc

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/cartant/eslint-etc/blob/master/LICENSE)
[![NPM version](https://img.shields.io/npm/v/eslint-etc.svg)](https://www.npmjs.com/package/eslint-etc)
[![Downloads](http://img.shields.io/npm/dm/eslint-etc.svg)](https://npmjs.org/package/eslint-etc)
[![Build status](https://img.shields.io/circleci/build/github/cartant/eslint-etc?token=43cceb8f45da20a867f4cee8b7068fdf5ceb1269)](https://app.circleci.com/pipelines/github/cartant)
[![dependency status](https://img.shields.io/david/cartant/eslint-etc.svg)](https://david-dm.org/cartant/eslint-etc)
[![devDependency Status](https://img.shields.io/david/dev/cartant/eslint-etc.svg)](https://david-dm.org/cartant/eslint-etc#info=devDependencies)
[![peerDependency Status](https://img.shields.io/david/peer/cartant/eslint-etc.svg)](https://david-dm.org/cartant/eslint-etc#info=peerDependencies)

More utils for use with `eslint`.

I use these utils to implement and test my own ESLint rules. That's their primary purpose, so the documentation is ... light.

## fromFixture

`fromFixture` allows TSLint-like fixtures to be used to test ESlint rules. Using fixtures means that you don't have to specify lines and columns. Instead, you underline the failure locations within the fixture, like this:

<!-- prettier-ignore -->
```ts
{
  invalid: [
    fromFixture(stripIndent`
      const name = "alice";
            ~~~~            [foo { "identifier": "name" }]
                   ~~~~~~~  [bar]
      const role = 'cto';
            ~~~~            [foo { "identifier": "role" }]
    `),
    fromFixture(stripIndent`
      const name = "alice";
            ~~~~            [foo { "identifier": "name" }]
      const role = 'cto';
            ~~~~            [foo { "identifier": "role" }]
    `, {
      options: [{ bar: false }]
    }),
  ]
}
```

which is equivalent to the following:

<!-- prettier-ignore -->
```ts
{
  invalid: [{
    code: `const name = "alice";
const role = 'cto';`,
    errors: [{
      column: 7,
      endColumn: 11,
      line: 1,
      endLine: 1,
      messageId: "foo",
      data: {
        identifier: "name",
      },
    }, {
      column: 14,
      endColumn: 21,
      line: 1,
      endLine: 1,
      messageId: "bar",
      data: {},
    }, {
      column: 7,
      endColumn: 11,
      line: 2,
      endLine: 2,
      messageId: "foo",
      data: {
        identifier: "role",
      },
    }]
  }, {
    code: `const name = "alice";
const role = 'cto';`,
    errors: [{
      column: 7,
      endColumn: 11,
      line: 1,
      endLine: 1,
      messageId: "foo",
      data: {
        identifier: "name",
      },
    }, {
      column: 7,
      endColumn: 11,
      line: 2,
      endLine: 2,
      messageId: "foo",
      data: {
        identifier: "role",
      },
    }],
    options: [{
      bar: false
    }]
  }]
}
```

Specifying `data` in the fixture is optional. If it's omitted, `data` defaults to `{}`.

The second, optional, argument passed to `fromFixture` can be used to pass additional test case properties - `options` and `output`, etc.

### Suggestions

A `suggestions` array can be passed to `fromFixture` via its second, optional parameter and, when passed, a `suggest` annotation can be used within the fixture, like this:

<!-- prettier-ignore -->
```ts
fromFixture(stripIndent`
  const a = "alice";
            ~~~~~~~ [foo suggest]
`, {
  suggestions: [{
    messageId: "suggestionForFoo",
    output: "/* suggestion output goes here */"
  }]
}),
```

And it's possible to include multiple `suggest` annotations and suggestions in a single fixture:

<!-- prettier-ignore -->
```ts
fromFixture(stripIndent`
  const a = "alice";
            ~~~~~~~ [foo suggest 0]
  const b = "bob";
            ~~~~~ [bar suggest 1]
`, {
  suggestions: [{
    messageId: "suggestionForFoo",
    output: "/* suggestion for foo output goes here */"
  }, {
    messageId: "suggestionForBar",
    output: "/* suggestion for bar output goes here */"
  }]
}),
```

The `suggest` annotations work with the `suggestions` array in the following manner:

-   If `suggest` is specified with no indices, all suggestions are associated with the annotated error.
-   If `suggest` is specified with indices, suggestions at those indices are associated with the annotated error.
-   If `suggest` is not specified, no suggestions are associated with the annotated error.
-   And if `suggestions` are specified without a `suggest` annotation being used, `fromFixture` will throw an error.

And if the rule has both a fixer and suggestions, you can specify an `output` - for the fixer - in conjunction with a `suggestions` array:

<!-- prettier-ignore -->
```ts
fromFixture(stripIndent`
  const a = "alice";
            ~~~~~~~ [foo suggest]
`, {
  output: "/* fixer output goes here */",
  suggestions: [{
    messageId: "suggestionForFoo",
    output: "/* suggestion output goes here */"
  }]
}),
```