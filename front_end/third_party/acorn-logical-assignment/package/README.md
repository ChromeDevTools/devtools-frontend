# Logical assignment support for Acorn

[![NPM version](https://img.shields.io/npm/v/acorn-logical-assignment.svg)](https://www.npmjs.org/package/acorn-logical-assignment)

This is a plugin for [Acorn](http://marijnhaverbeke.nl/acorn/) - a tiny, fast JavaScript parser, written completely in JavaScript.

It implements support for logical assignments as defined in the stage 3 proposal [Logical Assignments](https://github.com/tc39/proposal-logical-assignment). The AST follows [ESTree](https://github.com/estree/estree/blob/master/experimental/logical-assignment-operators.md).

## Usage

This module provides a plugin that can be used to extend the Acorn `Parser` class to parse logical assignments.
You can either choose to use it via CommonJS (for example in Node.js) like this

```javascript
var acorn = require('acorn');
var logicalAssignment = require('acorn-logical-assignment');
acorn.Parser.extend(logicalAssignment).parse('x ||= y');
```

or as an ECMAScript module like this:

```javascript
import {Parser} from 'acorn';
import logicalAssignment from 'path/to/acorn-logical-assignment.mjs';
Parser.extend(logicalAssignment).parse('x ||= y');
```

## License

This plugin is released under an [MIT License](./LICENSE).
