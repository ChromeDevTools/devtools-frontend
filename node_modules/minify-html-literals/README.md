# minify-html-literals

_Minify HTML markup inside JavaScript template literal strings._

[![npm](https://img.shields.io/npm/v/minify-html-literals.svg)](https://www.npmjs.com/package/minify-html-literals)
[![Build Status](https://travis-ci.com/asyncLiz/minify-html-literals.svg?branch=master)](https://travis-ci.com/asyncLiz/minify-html-literals)
[![Coverage Status](https://coveralls.io/repos/github/asyncLiz/minify-html-literals/badge.svg?branch=master)](https://coveralls.io/github/asyncLiz/minify-html-literals?branch=master)

## Why?

Template literals are often used in JavaScript to write HTML and CSS markup (ex. [lit-html](https://www.npmjs.com/package/lit-html)). This library allows a developer to minify markup that is normally ignored by JavaScript minifiers.

## Usage

```js
import { minifyHTMLLiterals } from 'minify-html-literals';
// const minifyHTMLLiterals = require('minify-html-literals').minifyHTMLLiterals

const result = minifyHTMLLiterals(
  `function render(title, items) {
    return html\`
      <style>
        .heading {
          color: blue;
        }
      </style>
      <h1 class="heading">\${title}</h1>
      <ul>
        \${items.map(item => {
          return getHTML()\`
            <li>\${item}</li>
          \`;
        })}
      </ul>
    \`;
  }`,
  {
    fileName: 'render.js'
  }
);

console.log(result.code);
//  function render(title, items) {
//    return html`<style>.heading{color:#00f}</style><h1 class=heading>${title}</h1><ul>${items.map(item => {
//          return getHTML()`<li>${item}</li>`;
//        })}</ul>`;
//  }

console.log(result.map);
// {
//   "version": 3,
//   "file": "render.js.map",
//   "sources": ["render.js"],
//   "sourcesContent": [null],
//   "names": [],
//   "mappings": "AAAA;gBACgB,qDAMU,QAAQ,SAE1B;2BACmB,IACX,OAAO,KACb;WACC,KAEP;"
// }
```

### ES5 Transpiling Warning

Be sure to minify template literals _before_ transpiling to ES5. Otherwise, the API will not be able to find any template literal (`` `${}` ``) strings.

## Supported Source Syntax

- JavaScript
- TypeScript

## Options

### Basic

The following options are common to typical use cases.

| Property                    | Type                                                                                         | Default                   | Description                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fileName`                  | string                                                                                       |                           | _Required._ The name of the file, used for syntax parsing and source maps.                                                                                                |
| `minifyOptions?`            | [html-minifier options](https://www.npmjs.com/package/html-minifier#options-quick-reference) | `defaultMinifyOptions`    | Defaults to production-ready minification.                                                                                                                                |
| `minifyOptions?.minifyCSS?` | [clean-css options](https://www.npmjs.com/package/clean-css#constructor-options)             | `defaultMinifyCSSOptions` | Uses clean-css defaults.                                                                                                                                                  |
| `shouldMinify?`             | function                                                                                     | `defaultShouldMinify`     | A function that determines whether or not an HTML template should be minified. Defaults to minify all tagged templates whose tag name contains "html" (case insensitive). |
| `shouldMinifyCSS?`          | function                                                                                     | `defaultShouldMinifyCSS`  | A function that determines whether or not a CSS template should be minified. Defaults to minify all tagged templates whose tag name contains "css" (case insensitive).    |

### Advanced

All aspects of the API are exposed and customizable. The following options will not typically be used unless you need to change how a certain aspect of the API handles a use case.

| Property                | Type                                                                      | Default                                                        | Description                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateSourceMap?`    | boolean or `(ms: MagicString, fileName: string) => SourceMap | undefined` | `defaultGenerateSourceMap`                                     | Set to `false` to disable source maps, or a custom function to control how source maps are generated from a `MagicString` instance.                        |
| `strategy?`             | object                                                                    | `defaultStrategy`                                              | An object with methods defining how to minify HTML. The default strategy uses [html-minifier](https://www.npmjs.com/package/html-minifier).                |
| `validate?`             | boolean or object                                                         | `defaultValidation`                                            | Set to `false` to disable strategy validation checks, or to a custom set of validation functions. This is only useful when implementing a custom strategy. |
| `parseLiterals?`        | function                                                                  | [parse-literals](https://www.npmjs.com/package/parse-literals) | Override the function used to parse template literals from a source string.                                                                                |
| `parseLiteralsOptions?` | object                                                                    |                                                                | Additional options to pass to `parseLiterals()`                                                                                                            |
| `MagicString?`          | function                                                                  | [MagicString](https://www.npmjs.com/package/magic-string)      | Override the MagicString-like constructor to use for manipulating the source string and generating source maps.                                            |

## Customization Examples

### Minify non-tagged templates

> This is particularly useful for libraries that define templates without using tags, such as Polymer's `<dom-module>`.

```js
import { minifyHTMLLiterals, defaultShouldMinify } from 'minify-html-literals';

minifyHTMLLiterals(
  `
    template.innerHTML = \`
      <dom-module id="custom-styles">
        <style>
          html {
            --custom-color: blue;
          }
        </style>
      </dom-module>
    \`;
  `,
  {
    fileName: 'render.js',
    shouldMinify(template) {
      return (
        defaultShouldMinify(template) ||
        template.parts.some(part => {
          return part.text.includes('<dom-module>');
        })
      );
    }
  }
);
```

### Do not minify CSS

```js
import { minifyHTMLLiterals, defaultMinifyOptions } from 'minify-html-literals';

minifyHTMLLiterals(source, {
  fileName: 'render.js',
  minifyOptions: {
    ...defaultMinifyOptions,
    minifyCSS: false
  },
  shouldMinifyCSS: () => false
});
```

### Modify generated SourceMap

```js
minifyHTMLLiterals(source, {
  fileName: 'render.js',
  generateSourceMap(ms, fileName) {
    return ms.generateMap({
      file: `${fileName}-converted.map`, // change file name
      source: fileName,
      includeContent: true // include source contents
    });
  }
});
```
