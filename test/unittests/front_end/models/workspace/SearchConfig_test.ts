// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';

const {SearchConfig} = Workspace.SearchConfig;

describe('SearchConfig', () => {
  describe('filePathMatchesFileQuery', () => {
    const url = (t: TemplateStringsArray) => t[0] as Platform.DevToolsPath.UrlString;

    it('returns true if the user query doesn\'t contain any f: or files: part', () => {
      const config = new SearchConfig('foo', true, false);

      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
    });

    it('works if the query contains a f: part', () => {
      const config = new SearchConfig('f:main.js foo', true, false);

      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://example.com/index.js`));
    });

    it('works if the query contains a file: part', () => {
      const config = new SearchConfig('file:main.js foo', true, false);

      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://example.com/index.js`));
    });

    it('works with multiple f: and file: parts (all of which must match)', () => {
      const config = new SearchConfig('file:m f:.js foo', true, false);

      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/index.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://google.de/a.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://google.de/b.js`));
    });

    it('allows * for f: parts', () => {
      const config = new SearchConfig('f:example.com/*.js foo', true, false);

      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/index.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://google.de/a.js`));
      assert.isFalse(config.filePathMatchesFileQuery(url`http://google.de/b.js`));
    });

    it('allows negation of f: parts', () => {
      const config = new SearchConfig('-f:main.js foo', true, false);

      assert.isFalse(config.filePathMatchesFileQuery(url`http://example.com/main.js`));
      assert.isTrue(config.filePathMatchesFileQuery(url`http://example.com/index.js`));
    });
  });

  describe('queries', () => {
    it('does not contain f: or file: parts', () => {
      const config = new SearchConfig('-f:index.js f:main.js foo', true, false);

      assert.deepEqual(config.queries(), ['foo']);
    });

    it('contains one part for simple searches', () => {
      const config = new SearchConfig('foo', true, false);

      assert.deepEqual(config.queries(), ['foo']);
    });

    it('contains one part for space separated simple words', () => {
      const config = new SearchConfig('foo bar', true, false);

      assert.deepEqual(config.queries(), ['foo bar']);
    });

    it('contains one part each for quoted simple words', () => {
      const config = new SearchConfig('"foo""bar"', true, false);

      assert.deepEqual(config.queries(), ['foo', 'bar']);
    });

    it('allows escaping of quotes', () => {
      const config = new SearchConfig('contains \\"escaped\\" quotes', true, false);

      assert.deepEqual(config.queries(), ['contains "escaped" quotes']);
    });

    it('doesn\'t remove quotes with the regex setting enabled', () => {
      const config = new SearchConfig('"foo""bar"', true, true);

      assert.deepEqual(config.queries(), ['"foo"', '"bar"']);
    });

    it('doesn\'t remove backslash escapes with the regex setting enabled', () => {
      const config = new SearchConfig('with an escaped \\" quote', true, true);

      assert.deepEqual(config.queries(), ['with an escaped \\" quote']);
    });
  });

  it('can be serialized/deserialized to a plain JS object', () => {
    const config = new SearchConfig('f:main.js foo', true, false);
    const restoredConfig = SearchConfig.fromPlainObject(config.toPlainObject());

    assert.strictEqual(restoredConfig.query(), config.query());
    assert.strictEqual(restoredConfig.ignoreCase(), config.ignoreCase());
    assert.strictEqual(restoredConfig.isRegex(), config.isRegex());
    assert.deepEqual(restoredConfig.queries(), config.queries());
  });
});
