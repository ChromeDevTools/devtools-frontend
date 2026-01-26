# js-rouge

[![npm version](https://img.shields.io/npm/v/js-rouge.svg)](https://www.npmjs.com/package/js-rouge)
[![CI](https://github.com/promptfoo/js-rouge/actions/workflows/ci.yml/badge.svg)](https://github.com/promptfoo/js-rouge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A JavaScript implementation of the Recall-Oriented Understudy for Gisting Evaluation (ROUGE) evaluation metric for summaries. This package implements the following metrics:

- n-gram (ROUGE-N)
- Longest Common Subsequence (ROUGE-L)
- Skip Bigram (ROUGE-S)

> **Note**: This is a fork of [the original ROUGE.js](https://github.com/kenlimmj/rouge) by kenlimmj. This fork adds TypeScript types, security fixes, and other improvements.

## Rationale

ROUGE is somewhat a standard metric for evaluating the performance of auto-summarization algorithms. However, with the exception of [MEAD](http://www.summarization.com/mead/) (which is written in Perl. Yes. Perl.), requesting a copy of ROUGE to work with requires one to navigate a barely functional [webpage](http://www.isi.edu/licensed-sw/see/rouge/), fill up [forms](http://www.berouge.com/Pages/DownloadROUGE.aspx), and sign a legal release somewhere along the way while at it. These definitely exist for good reason, but it gets irritating when all one wishes to do is benchmark an algorithm.

Nevertheless, the [paper](http://www.aclweb.org/anthology/W04-1013) describing ROUGE is available for public consumption. The appropriate course of action is then to convert the equations in the paper to a more user-friendly format, which takes the form of the present repository. So there. No more forms. See how life could have been made a lot easier for everyone if we were all willing to stop writing legalese or making people click submit buttons?

## Quick Start

This package is available on NPM:

```shell
npm install js-rouge
```

To use it:

```javascript
import { n, l, s } from "js-rouge"; // ES Modules

// OR

const { n, l, s } = require("js-rouge"); // CommonJS
```

## Usage

js-rouge provides three main functions:

- **ROUGE-N**: `n(candidate, reference, opts)` - N-gram overlap
- **ROUGE-L**: `l(candidate, reference, opts)` - Longest Common Subsequence
- **ROUGE-S**: `s(candidate, reference, opts)` - Skip-bigram co-occurrence

All functions return an F-score between 0 and 1.

### ROUGE-N Example

```javascript
import { n as rougeN } from "js-rouge";

const candidate = "the cat sat on the mat";
const reference = "the cat sat on the mat";

// ROUGE-1 (unigram)
rougeN(candidate, reference, { n: 1 }); // => 1.0

// ROUGE-2 (bigram)
rougeN(candidate, reference, { n: 2 }); // => 1.0

// With partial match
rougeN("the cat sat", "the cat sat on the mat", { n: 1 }); // => 0.75
```

### ROUGE-L Example

```javascript
import { l as rougeL } from "js-rouge";

const reference = "police killed the gunman";
const candidate = "police kill the gunman";

rougeL(candidate, reference); // => 0.75
```

### ROUGE-S Example

```javascript
import { s as rougeS } from "js-rouge";

const reference = "police killed the gunman";
const candidate = "police kill the gunman";

// Default: considers all word pairs
rougeS(candidate, reference); // => 0.5

// With skip distance limit
rougeS(candidate, reference, { maxSkip: 2 }); // considers only nearby word pairs
```

### Case Sensitivity

All functions are case-sensitive by default. Use `caseSensitive: false` for case-insensitive comparison:

```javascript
import { n as rougeN } from "js-rouge";

rougeN("Hello World", "hello world"); // => 0 (no match)
rougeN("Hello World", "hello world", { caseSensitive: false }); // => 1.0
```

## Options

### ROUGE-N Options

| Option          | Type     | Default       | Description                                            |
| --------------- | -------- | ------------- | ------------------------------------------------------ |
| `n`             | number   | `1`           | N-gram size (1 = unigram, 2 = bigram, etc.)            |
| `beta`          | number   | `1.0`         | F-measure weight (1.0 = F1, balanced precision/recall) |
| `caseSensitive` | boolean  | `true`        | Whether comparison is case-sensitive                   |
| `tokenizer`     | function | Penn Treebank | Custom tokenizer function                              |
| `nGram`         | function | built-in      | Custom n-gram generator                                |

### ROUGE-L Options

| Option          | Type     | Default       | Description                          |
| --------------- | -------- | ------------- | ------------------------------------ |
| `beta`          | number   | `1.0`         | F-measure weight                     |
| `caseSensitive` | boolean  | `true`        | Whether comparison is case-sensitive |
| `tokenizer`     | function | Penn Treebank | Custom tokenizer function            |
| `segmenter`     | function | built-in      | Custom sentence segmenter            |
| `lcs`           | function | built-in      | Custom LCS function                  |

### ROUGE-S Options

| Option          | Type     | Default       | Description                          |
| --------------- | -------- | ------------- | ------------------------------------ |
| `beta`          | number   | `1.0`         | F-measure weight                     |
| `caseSensitive` | boolean  | `true`        | Whether comparison is case-sensitive |
| `maxSkip`       | number   | `Infinity`    | Maximum skip distance between words  |
| `tokenizer`     | function | Penn Treebank | Custom tokenizer function            |
| `skipBigram`    | function | built-in      | Custom skip-bigram generator         |

### Limitations

- **English-centric tokenizer**: The default Penn Treebank tokenizer is designed for English text. For other languages, provide a custom `tokenizer` function that appropriately segments text in your target language.

## Jackknife Resampling

The package also exports utility functions, including jackknife resampling as described in the original paper:

```javascript
import { n as rougeN, jackKnife } from "js-rouge";

const reference = "police killed the gunman";
const candidates = [
  "police kill the gunman",
  "the gunman kill police",
  "the gunman police killed",
];

// Standard evaluation taking the arithmetic mean
jackKnife(candidates, reference, rougeN);

// Modified evaluation taking the distribution maximum
const distMax = (arr) => Math.max(...arr);
jackKnife(candidates, reference, rougeN, distMax);
```

## TypeScript

This package is written in TypeScript and includes type definitions. All functions and utilities are fully typed.

```typescript
import { n, l, s, jackKnife } from "js-rouge";

const score: number = n("candidate text", "reference text", { n: 2 });
```

### Exported Types

Option interfaces are exported for typing your own functions and configurations:

```typescript
import { n, RougeNOptions, RougeSOptions, RougeLOptions } from "js-rouge";

// Type your options objects
const opts: RougeNOptions = { n: 2, caseSensitive: false };
const score = n("candidate", "reference", opts);

// Type function parameters
function evaluateSummary(
  candidate: string,
  reference: string,
  opts: RougeNOptions,
): number {
  return n(candidate, reference, opts);
}
```

## Versioning

Development will be maintained under the Semantic Versioning guidelines as much as possible in order to ensure transparency and backwards compatibility.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>`

And constructed with the following guidelines:

- Breaking backward compatibility bumps the major (and resets the minor and patch)
- New additions without breaking backward compatibility bump the minor (and resets the patch)
- Bug fixes and miscellaneous changes bump the patch

For more information on SemVer, visit http://semver.org/.

## Bug Tracking and Feature Requests

Have a bug or a feature request? [Please open a new issue](https://github.com/promptfoo/js-rouge/issues).

## Contributing

Please submit all pull requests against the main branch. All code should pass ESLint validation and tests.

The amount of data available for writing tests is unfortunately woefully inadequate. We've tried to be as thorough as possible, but that eliminates neither the possibility of nor existence of errors. The gold standard is the DUC data-set, but that too is form-walled and legal-release-walled, which is infuriating. If you have data in the form of a candidate summary, reference(s), and a verified ROUGE score you do not mind sharing, we would love to add that to the test harness.

## License

MIT
