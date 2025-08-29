# parse-statements ✂️

[![NPM version][npm-image]][npm-url]
[![dependencies: none][dependencies-none-image]][dependencies-none-url]
[![minzipped size][size-image]][size-url]
[![code style: prettier][prettier-image]][prettier-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![License MIT][license-image]][license-url]

Fast and easy parser of statements in source code in any language.

`parse-statements` ✂️ allows you to parse statements consisting of a sequence of tokens
with arbitrary text between them. Statements cannot overlap.

In addition to statements, language comments can be described, which can also be located
inside statements (between its neighboring tokens).

Strings are used to describe (find) tokens, from which regexps with `gmu` flags are generated
(therefore, the backslash in these lines must be escaped, that is, it must be doubled).

For each parsed statement, the optional `onParse` callback is called with the context,
source code (string), and an array of tokens of statement
(and an array of comments between this token and the next one, if any).

If the sequence of tokens of statement has not completed, instead of the `onParse` callback,
an `onError` callback with the same signature is called, receiving an incomplete sequence
of parsed tokens of statement.

Similar optional callbacks can be set for comments.

Callbacks for statements (only for statements, not for comments) can return a number
instead of an `undefined` — then this number will be used as an index at the source code,
starting from which the parser will find the next statement.

In fact, this index will be interpreted as the end of the statement. By default,
the end of the statement coincides with the end of its last token,
but sometimes we may need to go beyond the boundaries of the found tokens
(or, conversely, reduce the length of the statement, that is, reduce its end index).

With such manual parsing, if we increase the index of the end of the statement,
we must remember to manually parse the comments that may appear
in this part of the statement — because the parser itself will not do this.
It will continue to work from the new end of the statement as usual.

## Basic example

Below is a simplified example ([see on TypeScript Playground](https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbwMZQKYEMaoArqgZ1QDEBXAOyRmAjIF84AzKCEOAcjD0IFp8ZNUIVGRj42AbgBQk0JFhwYATzCpEAeTIBhFkJEBRKMygAaOBu0hdMXAVSmNNwvSYt2nW735YrYqZKQ0fAoAFswA7gZGcAC8cAAUQvj46ADmqABccHxQwGQpAJSZAG4QwAAmMQB8iJJwIeFwZKhhcJHQCahJqaj5UrR+Sipw2iKoAB7wsQBKGGU0ADaKADwItXCohtD4meQA1mQQYWQA2gC6UnXjcqKZx1fQN1kwOXmmAHQfAZbCj9m5KWdTmcLnBZA9tnBjmDYJk-q84B83l8fLDnv9AcC1iASPMqPNcqgLCini8Aec1vh-vNUPimkSfhC4WS+pU-AEyEE0jB6SIAMoQEhQJCqWJxCkCoUZEn-YxrTjAKCZNDoOZkRaQhDCMqZMgkEAAIw2tFMCD4eBgOr1hqgtFOssK0ryVSyEuFb3w+OFcXlUGOAAZTm8taYfccAIyBs2wXrSdlBGg8mBtRVmLQ6H7JpYjLATaqigD67JzMFM+FddkQUZgtHyztWdRgoUOybiZcFbo9wC9VfyMf6scC8AT6ZEjil5hH1i4qCzNGLefipqpNIJifwxpd7YrmrIZQ3pv4sBrdYpy9phMn+DeYBI+GCrfL7s9qDiwae5t7fTZg7gNGTmQcadZ1GXMYkXDYjHXUty3eD4YAgXZhHwWtomqet1k2Ahr1ve820lJ8uxfeDEI5f1TgAQndQ8SwUBCkOOYikLeak8kbOBuDgCNKK1OAAGo4AAZj9T9JH7fwfz-MZrjHACyDHYDi1MASFzFOpNSk8FjXFLdZUuDTYF5ajdPWfSYAAGWAPg9F3Yz7lgayyntE86jjeA7JgQzzTXMD3M82AkUvAB+N4QHQMA4m9dAFRQ6ouUTfktwfHS4B9ESXJ-dyLL4bzYkyyyk13ALvhEfBgtC8LIui504snBLJSSyUQyiqARLWdyrxvO84mONY6jwjtn1fUy-JgIMbJM64HKoj9jLqREhuuEbvIAH2WyFTnyWaEQ+BaHiy7lLzgVb1s2tYNq-AcOSHMgAElwAeGTU3k7Nxho5SwNUxBoVELS+pgtZvpG4zvqIZgQGB+77JsyQYpqdKrtBSGPOonLEcW6iip8Mqwoi1LqtQA7io88sGuFJropjeGghBsHUZplhMYZbGKrx1C4Bqom6u7GCUua1q6m+jqcO63rN3wzsvUBjG32+qaey2+apa8w7jrOU66jmnb6ZAFa1rV4zztE78EfcQg7uufA9FM-AwJQDAsDHUgKCoGgFNeyo4nQ5EGVuUX0I138yH-QPE2TLa6hoR7hyJsdw9okiIWONgAB1k4AelTtO2FMNgABJU7IQK2DtUXfo1-2Nb-TDMmjqww9FiO5OnTJPexXFgHPNcN367ctX3KtjzZiuA7bvFV0vbCup7givTfHtKYDuAy4DxiOVuFP09TgAqbP2G3zPi62suS8b4O4kLOdXtMfMe9MRJkjSWHG3CFt7+6dX328H3IT9hu4CQdAt0KDzBIGUC8RMITPBIHYP+VcjBx0js3QO5sHrTjgOgG2gFbBx1XonNgAA9b6qd9S7w3vqFwIBiGkPzsnQuh8-53gFPMMovIMBCmCAAIVQAwaA4DiRQJgQHZecNF4AKAUgEBYC1yZAEQgoOmE5FRyDqZMc6DMFN2wX-XB698HuSoTnVOtBqEFyLifRejCcQsLYUgTh3DeHSIUFAaBR8DayhrMbamSNLbW0yC9CYYF0IQS2LcMx7UQkQwtuErEOIx50kvFEvqZ5x4QKiWJU2qAUGwG8RbT6gsrYW2MgAAxkEjRAPCIDODBuwN4adykSBKdcOA+o8CMCqWwGpzSoBsGkGnNOcAAAqwRLKghtugf+k5pDfTgGnLeLohDjKJnALefTOmtNcJ0vwbB0DzDLGjB4azWAbO6Q0-ZqyKHVLTs0gAXscqZYRgBsSCVAKQUzekLKsKCMgez5D3MbAKeAFC-DuTKRACp0zZnbN2d7EQ9BllSGBTM95PxPkTQeLCvpCBOm0EkIU+0HiIDUmYhAFIcQ8nWxjEAA))
of parsing `import` and `export` statements in ECMAScript
(a complete example can be found [here](https://github.com/joomcode/parse-imports-exports/blob/main/src/index.ts)):

```ts
import {createParseFunction} from 'parse-statements';

import type {OnCommentError, OnCommentParse, OnParse} from 'parse-statements';

const throwError = (message: string): void => {
  throw new Error(message);
};

type Context = Readonly<{
  errors: unknown[];
  exports: [exports: string, ...comments: string[]][];
  imports: [import: string, ...comments: string[]][];
  multilineComments: string[];
  singlelineComments: string[];
}>;

const getCommentSource = (
  source: string,
  pair: readonly [{end: number}, {start: number}],
): string => source.slice(pair[0].end, pair[1].start);

const onCommentError: OnCommentError<Context> = (_context, source, {start}) => {
  throwError(source.slice(start));
};

const onCommentParse: OnCommentParse<Context> = ({singlelineComments}, source, {end}, {start}) => {
  singlelineComments.push(source.slice(end, start));
};

const onError: OnParse<Context> = ({errors}, source, ...tokens) => {
  errors.push(source.slice(tokens[0]!.start, tokens[tokens.length - 1]!.end + 30));
};

const onExportParse: OnParse<Context, 3> = (
  {exports},
  source,
  exportStart,
  exportListEnd,
  exportEnd,
) => {
  const exportStartComments = exportStart.comments?.map((pair) => getCommentSource(source, pair));
  const exportListComments = exportListEnd.comments?.map((pair) => getCommentSource(source, pair));

  exports.push([
    source.slice(exportStart.end, exportEnd.start),
    ...(exportStartComments || []),
    ...(exportListComments || []),
  ]);
};

const onImportParse: OnParse<Context, 3> = (
  {imports},
  source,
  importStart,
  importFrom,
  importEnd,
) => {
  const importStartComments = importStart.comments?.map((pair) => getCommentSource(source, pair));
  const importFromComments = importFrom.comments?.map((pair) => getCommentSource(source, pair));

  imports.push([
    source.slice(importStart.end, importEnd.start),
    ...(importStartComments || []),
    ...(importFromComments || []),
  ]);
};

const parseImportsExports = createParseFunction<Context>({
  comments: [
    {
      onError: onCommentError,
      onParse: onCommentParse,
      tokens: ['\\/\\/', '$\\n?'],
    },
    {
      onError: onCommentError,
      onParse: ({multilineComments}, source, {end}, {start}) => {
        multilineComments.push(source.slice(end, start));
      },
      tokens: ['\\/\\*', '\\*\\/'],
    },
  ],
  onError: (_context, _source, message) => throwError(message),
  statements: [
    {
      canIncludeComments: true,
      onError,
      onParse: onImportParse as OnParse,
      tokens: ['^import\\b', '\\bfrom\\b', '$\\n?'],
      shouldSearchBeforeComments: true,
    },
    {
      canIncludeComments: true,
      onError,
      onParse: onExportParse as OnParse,
      tokens: ['^export\\b', '\\}', '$\\n?'],
      shouldSearchBeforeComments: true,
    },
  ],
});

const importsExports: Context = {
  errors: [],
  exports: [],
  imports: [],
  multilineComments: [],
  singlelineComments: [],
};

parseImportsExports(
  importsExports,
  `
import {foo} from './foo';
import bar from './bar'

// This is a comment

import /* some comment */ bar from bar;

'also import from bar;'

import bar from './baz'

import with error;
import // comment in import without from;

export {foo} /* also comment} */;
export /* comment in export} */ {bar}
`,
);

console.log(importsExports);
```

## Install

Requires [node](https://nodejs.org/en/) version 10 or higher:

```sh
npm install parse-statements
```

`parse-statements` ✂️ works in any environment that supports ES2018
(because package uses [RegExp Named Capture Groups](https://github.com/tc39/proposal-regexp-named-groups)).

## API

`parse-statements` ✂️ exports one runtime value — the `createParseFunction` function:

```ts
import {createParseFunction} from 'parse-statements';

type Context = ...; // some type

const parse = createParseFunction<Context>(options);

const context: Context = ...;

parse(context, 'some source code (as string)');
```

The `options` object defines comments, statements, and a global error callback handler
(all of these fields are optional):

```ts
import type {Comment, OnGlobalError, Options, ParsedToken, Statement} from 'parse-statements';

const options: Options<Context> = {
  comments, // an optional array of comments
  onError, // an optional callback handler for global parsing errors
  statements, // an optional array of statements
};

const comments: readonly Comment<Context>[] = [
  {
    onError(
      context: Context,
      source: string,
      parsedToken: {start: number; end: number; match: RegExpExecArray; token: string},
    ) {
      // An optional callback handler is called if, after the opening comment token,
      // its closing token was not found.
      // Parsing continues from the point immediately after the opening token.
    },
    onParse(
      context: Context,
      source: string,
      openParsedToken: {start: number; end: number; match: RegExpExecArray; token: string},
      closeParsedToken: {start: number; end: number; match: RegExpExecArray; token: string},
    ) {
      // An optional callback handler of comment for putting something in context.
      // The handler is called when the parsing of the comment is completed,
      // that is, the parsing of the close comment token is completed.
      // The handler receives opening parsed token and closing parsed token.
      // Parsing continues from the point immediately after the closing token.
    },
    // Opening and closing tokens of comment
    // (which are converted to regexps using the `RegExp` constructor).
    tokens: ['open raw token', 'close raw token'],
  },
];

const onError: OnGlobalError<Context> = (
  context: Context,
  source: string,
  message: string,
  index: number,
) => {
  // An optional callback handler is called when there are global parsing errors.
};

const statements: readonly Statement<Context>[] = [
  {
    // If `true`, then we parse comments inside the statement (between its parts).
    canIncludeComments: true,
    onError(
      context: Context,
      source: string,
      firstParsedToken: ParsedToken & {comments?: [ParsedToken, ParsedToken][]},
      secondParsedToken: ParsedToken & {comments?: [ParsedToken, ParsedToken][]},
      // ...,
      lastParsedToken: ParsedToken,
    ) {
      // An optional callback handler is called if parsing the statement failed, that is,
      // parsing started with the first statement token, but some next token was not found.
      // The handler receives all already parsed statement tokens.
      // If there were comments between a token and its next token, they are passed
      // to the parsed token object as a separate `comments` property
      // (thus, the last parsed token cannot have comments).
      // Parsing continues from the point immediately after the last parsed token.
    },
    onParse(
      context: Context,
      source: string,
      firstParsedToken: ParsedToken & {comments?: [ParsedToken, ParsedToken][]},
      secondParsedToken: ParsedToken & {comments?: [ParsedToken, ParsedToken][]},
      // ...,
      lastParsedToken: ParsedToken,
    ) {
      // An optional callback handler of statement for putting something in context.
      // The handler is called when the parsing of the statement is completed,
      // that is, the parsing of the last statement token is completed.
      // The handler receives all parsed statement tokens.
      // If there were comments between a token and its next token, they are passed
      // to the parsed token object as a separate `comments` property
      // (thus, the last parsed token cannot have comments).
      // Parsing continues from the point immediately after the last statement token.
    },
    // Not-empty array of statement raw tokens
    // (which are converted to regexps using the `RegExp` constructor).
    // A statement can have any positive number of tokens.
    tokens: ['first raw token', 'second raw token'],
    // If `true`, then the statement fisrt token is searched before the comment tokens,
    // otherwise after. This can affect parsing because if several different tokens
    // (first tokens of statements or opening comment tokens) are found
    // at some position in the source, only the first one will be selected and parsed.
    shouldSearchBeforeComments: true,
  },
];
```

`parse-statements` ✂️ also exports all types included in the API:

```ts
export type {
  /**
   * Description of comment as the callback handlers and open and close tokens.
   */
  Comment,
  /**
   * Pair of the comment open and close tokens (raw or parsed).
   */
  CommentPair,
  /**
   * `onError` callback handler for error on comment parsing.
   */
  OnCommentError,
  /**
   * `onParse` callback handler of comment.
   */
  OnCommentParse,
  /**
   * Global `onError` callback handler for error on parsing.
   */
  OnGlobalError,
  /**
   * `onParse` callback handler of statement with concrete length (number of tokens).
   */
  OnParse,
  /**
   * Options of `createParseFunction` function.
   */
  Options,
  /**
   * Parse function.
   */
  Parse,
  /**
   * The result of parsing the token.
   */
  ParsedToken,
  /**
   * Description of statement as the callback handlers and a sequence of tokens.
   */
  Statement,
};
```

## License

[MIT][license-url]

[conventional-commits-image]: https://img.shields.io/badge/Conventional_Commits-1.0.0-yellow.svg 'The Conventional Commits specification'
[conventional-commits-url]: https://www.conventionalcommits.org/en/v1.0.0/
[dependencies-none-image]: https://img.shields.io/badge/dependencies-none-success.svg 'No dependencies'
[dependencies-none-url]: https://github.com/joomcode/parse-statements/blob/main/package.json
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg 'The MIT License'
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/parse-statements.svg 'parse-statements'
[npm-url]: https://www.npmjs.com/package/parse-statements
[prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg 'Prettier code formatter'
[prettier-url]: https://prettier.io/
[size-image]: https://img.shields.io/bundlephobia/minzip/parse-statements 'parse-statements'
[size-url]: https://bundlephobia.com/package/parse-statements
