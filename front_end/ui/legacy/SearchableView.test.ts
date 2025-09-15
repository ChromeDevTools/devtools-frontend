// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from './legacy.js';

describe('SearchableView', () => {
  describe('SearchConfig', () => {
    const {SearchConfig} = UI.SearchableView;

    describe('constructor', () => {
      it('supports matching by case or whole word, and using regular expressions', () => {
        const config = new SearchConfig('foo', /* caseSensitive=*/ true, /* wholeWord=*/ true, /* isRegex=*/ false);

        assert.isTrue(config.caseSensitive);
        assert.isTrue(config.wholeWord);
        assert.isFalse(config.isRegex);
      });
    });

    describe('toSearchRegex', () => {
      it('supports case sensitive matches', () => {
        const config = new SearchConfig('foo', /* caseSensitive=*/ true, /* wholeWord=*/ false, /* isRegex=*/ false);

        const {regex} = config.toSearchRegex();

        assert.strictEqual(regex.flags, '');
        assert.strictEqual(regex.source, 'foo');
      });

      it('supports case insensitive matches', () => {
        const config = new SearchConfig('foo', /* caseSensitive=*/ false, /* wholeWord=*/ false, /* isRegex=*/ false);

        const {regex} = config.toSearchRegex();

        assert.strictEqual(regex.flags, 'i');
        assert.strictEqual(regex.source, 'foo');
      });

      it('supports whole word matches', () => {
        const config = new SearchConfig('foo', /* caseSensitive=*/ true, /* wholeWord=*/ true, /* isRegex=*/ false);

        const {regex} = config.toSearchRegex();

        assert.strictEqual(regex.source, '\\bfoo\\b');
      });

      it('supports whole word matches with regular expressions', () => {
        const config = new SearchConfig('ba[rz]', /* caseSensitive=*/ true, /* wholeWord=*/ true, /* isRegex=*/ true);

        const {regex} = config.toSearchRegex();

        assert.strictEqual(regex.source, '\\bba[rz]\\b');
      });
    });
  });
});
