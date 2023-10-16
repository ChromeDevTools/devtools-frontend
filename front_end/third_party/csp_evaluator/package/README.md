# CSP Evaluator Core Library

## Introduction

--------------------------------------------------------------------------------

Please note: this is not an official Google product.

CSP Evaluator allows developers and security experts to check if a Content
Security Policy ([CSP](https://csp.withgoogle.com/docs/index.html)) serves as a
strong mitigation against
[cross-site scripting attacks](https://www.google.com/about/appsecurity/learning/xss/).
It assists with the process of reviewing CSP policies, and helps identify subtle
CSP bypasses which undermine the value of a policy. CSP Evaluator checks are
based on a [large-scale study](https://research.google.com/pubs/pub45542.html)
and are aimed to help developers to harden their CSP and improve the security of
their applications. This tool is provided only for the convenience of developers
and Google provides no guarantees or warranties for this tool.

CSP Evaluator comes with a built-in list of common CSP allowlist bypasses which
reduce the security of a policy. This list only contains popular bypasses and is
by no means complete.

The CSP Evaluator library + frontend is deployed here:
https://csp-evaluator.withgoogle.com/

## Installing

This library is published to `https://www.npmjs.com/package/csp_evaluator`. You
can install it via:

```bash
npm install csp_evaluator
```

## Building

To build, run:

```bash
npm install && tsc --build
```

## Testing

To run unit tests, run:

```bash
npm install && npm test
```

## Example Usage

```javascript
import {CspEvaluator} from "csp_evaluator/dist/evaluator.js";
import {CspParser} from "csp_evaluator/dist/parser.js";

const parsed = new CspParser("script-src https://google.com").csp;
console.log(new CspEvaluator(parsed).evaluate());
```

