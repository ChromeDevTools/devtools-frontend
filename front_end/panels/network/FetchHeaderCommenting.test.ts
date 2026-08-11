// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Network from './network.js';

const {commentForbiddenHeaders, isForbiddenHeader} = Network.FetchHeaderCommenting;

describeWithEnvironment('FetchHeaderCommenting', () => {
  describe('isForbiddenHeader', () => {
    it('handles exact names, prefixes, and value-dependent rules', () => {
      assert.isTrue(isForbiddenHeader('Host', 'example.com'));
      assert.isTrue(isForbiddenHeader('Sec-Fetch-Mode', 'cors'));
      assert.isTrue(isForbiddenHeader('X-HTTP-Method-Override', 'PATCH, TRACE'));
      assert.isFalse(isForbiddenHeader('X-HTTP-Method-Override', 'PATCH'));
      assert.isFalse(isForbiddenHeader('User-Agent', 'custom'));
    });
  });

  describe('commentForbiddenHeaders', () => {
    it('passes through serialized options with no forbidden headers unchanged', () => {
      const input = `{
  "headers": {
    "accept": "application/json",
    "x-custom": "value"
  },
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "include"
}`;
      assert.strictEqual(commentForbiddenHeaders(input), input);
    });

    it('comments out a single forbidden header with append style', () => {
      const input = `{
  "headers": {
    "accept": "application/json",
    "host": "example.com",
    "x-custom": "value"
  },
  "body": null,
  "method": "GET"
}`;
      const expected = `{
  "headers": {
    "accept": "application/json",
    // "host": "example.com", // Browser will derive from URL
    "x-custom": "value"
  },
  "body": null,
  "method": "GET"
}`;
      assert.strictEqual(commentForbiddenHeaders(input), expected);
    });

    it('groups consecutive sec-* headers with a prefix comment', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    "sec-ch-ua": "\\"Chrome\\";v=\\"149\\"",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate"
  },
  "method": "GET"
});`;
      const expected = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    // All sec-* headers are set by the browser
    // "sec-ch-ua": "\\"Chrome\\";v=\\"149\\"",
    // "sec-ch-ua-mobile": "?0",
    // "sec-fetch-dest": "document",
    // "sec-fetch-mode": "navigate"
  },
  "method": "GET"
});`;
      assert.strictEqual(commentForbiddenHeaders(input), expected);
    });

    it('handles multiple different forbidden headers', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    "cookie": "session=abc123",
    "host": "example.com",
    "x-custom": "value"
  },
  "method": "GET"
});`;
      const expected = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    // "cookie": "session=abc123", // Browser manages this from the cookie jar
    // "host": "example.com", // Browser will derive from URL
    "x-custom": "value"
  },
  "method": "GET"
});`;
      assert.strictEqual(commentForbiddenHeaders(input), expected);
    });

    it('comments all unconditional forbidden request headers', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "cookie2": "legacy=value",
    "date": "Thu, 01 Jan 1970 00:00:00 GMT",
    "expect": "100-continue",
    "set-cookie": "name=value",
    "te": "trailers",
    "trailer": "Expires",
    "transfer-encoding": "chunked",
    "upgrade": "websocket",
    "via": "1.1 example.com"
  },
  "method": "POST"
});`;
      const result = commentForbiddenHeaders(input);

      for (const headerName
               of ['cookie2', 'date', 'expect', 'set-cookie', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'via']) {
        assert.include(result, `// "${headerName}":`);
      }
    });

    it('only comments method override headers whose values contain a forbidden method', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "x-http-method": "CONNECT",
    "x-http-method-override": "PATCH, TRACE",
    "x-method-override": "TRACK",
    "X-HTTP-Method-Override": "PATCH"
  },
  "method": "POST"
});`;
      const expected = `fetch("https://example.com/", {
  "headers": {
    // "x-http-method": "CONNECT", // Browser blocks overrides to forbidden methods
    // "x-http-method-override": "PATCH, TRACE", // Browser blocks overrides to forbidden methods
    // "x-method-override": "TRACK", // Browser blocks overrides to forbidden methods
    "X-HTTP-Method-Override": "PATCH"
  },
  "method": "POST"
});`;

      assert.strictEqual(commentForbiddenHeaders(input), expected);
    });

    it('flushes prefix comment when a non-matching header interrupts sec-* group', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "sec-ch-ua": "Chrome",
    "sec-ch-ua-mobile": "?0",
    "accept": "text/html",
    "sec-fetch-dest": "document"
  },
  "method": "GET"
});`;
      const expected = `fetch("https://example.com/", {
  "headers": {
    // All sec-* headers are set by the browser
    // "sec-ch-ua": "Chrome",
    // "sec-ch-ua-mobile": "?0",
    "accept": "text/html",
    // All sec-* headers are set by the browser
    // "sec-fetch-dest": "document"
  },
  "method": "GET"
});`;
      assert.strictEqual(commentForbiddenHeaders(input), expected);
    });

    it('does not modify lines outside the headers block, even if they match forbidden names', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html"
  },
  "host": "example.com",
  "origin": "https://example.com",
  "referrer": "https://example.com/",
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "include"
});`;
      assert.strictEqual(commentForbiddenHeaders(input), input);
    });

    it('bails out on anomalous lines inside headers block', () => {
      const input = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    something unexpected here
    "host": "example.com"
  },
  "method": "GET"
});`;
      // After seeing the anomalous line, processing stops — "host" is NOT commented
      assert.strictEqual(commentForbiddenHeaders(input), input);
    });

    it('handles a fetch with no headers block', () => {
      const input = `fetch("https://example.com/api", {
  "body": null,
  "method": "GET"
});`;
      assert.strictEqual(commentForbiddenHeaders(input), input);
    });

    it('does not treat options after an empty headers object as headers', () => {
      const input = `fetch("https://example.com/", {
  "headers": {},
  "method": "GET"
});`;
      const customRules = [
        {pattern: /^method$/i, comment: () => 'not a header', style: 'append' as const},
      ];

      assert.strictEqual(commentForbiddenHeaders(input, customRules), input);
    });

    it('supports custom rules', () => {
      const customRules = [
        {pattern: /^x-internal-/i, comment: () => 'internal header', style: 'append' as const},
      ];
      const input = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    "x-internal-trace": "abc123"
  },
  "method": "GET"
});`;
      const expected = `fetch("https://example.com/", {
  "headers": {
    "accept": "text/html",
    // "x-internal-trace": "abc123" // internal header
  },
  "method": "GET"
});`;
      assert.strictEqual(commentForbiddenHeaders(input, customRules), expected);
    });
  });
});
