# parse-literals

_Because sometimes you literally need to parse template literals._

[![npm](https://img.shields.io/npm/v/parse-literals.svg)](https://www.npmjs.com/package/parse-literals)
[![Build Status](https://travis-ci.com/asyncLiz/parse-literals.svg?branch=master)](https://travis-ci.com/asyncLiz/parse-literals)
[![Coverage Status](https://coveralls.io/repos/github/asyncLiz/parse-literals/badge.svg?branch=master)](https://coveralls.io/github/asyncLiz/parse-literals?branch=master)

## Why?

Template literals are often used in JavaScript for HTML and CSS. This library allows developers to extract the strings from the literals for post processing, such as minifying or linting.

## Usage

```js
import * as pl from 'parse-literals';
// const pl = require('parse-literals');

const templates = pl.parseLiterals(`
  render() {
    return html\`
      <h1>\${"Hello World"}</h1>
    \`;
  }
`);

console.log(templates);
// [
//   {
//     "tag": "html",
//     "parts": [
//       {
//         "text": "\n      <h1>",
//         "start": 30,
//         "end": 41
//       },
//       {
//         "text": "</h1>\n    ",
//         "start": 57,
//         "end": 67
//       }
//     ]
//   }
// ]
```

## Supported Source Syntax

- JavaScript
- TypeScript
