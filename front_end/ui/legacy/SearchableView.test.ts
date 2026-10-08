// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

function createSearchable(): UI.SearchableView.Searchable {
  return {
    onSearchCanceled: sinon.spy(),
    performSearch: sinon.spy(),
    jumpToNextSearchResult: sinon.spy(),
    jumpToPreviousSearchResult: sinon.spy(),
    supportsCaseSensitiveSearch: () => true,
    supportsWholeWordSearch: () => true,
    supportsRegexSearch: () => true,
  };
}

describeWithEnvironment('SearchableView', () => {
  describe('searchTarget', () => {
    it('detaches the previous target before attaching the new target', () => {
      const searchableView = new UI.SearchableView.SearchableView(createSearchable(), null);
      const calls: Array<{target: string, view: UI.SearchableView.SearchResultsListener | null}> = [];
      const firstTarget: UI.SearchableView.SearchTarget = {
        setSearchableView(view) {
          calls.push({target: 'first', view});
        },
      };
      const secondTarget: UI.SearchableView.SearchTarget = {
        setSearchableView(view) {
          calls.push({target: 'second', view});
        },
      };

      searchableView.searchTarget = firstTarget;
      assert.deepEqual(calls, [{target: 'first', view: searchableView}]);

      calls.length = 0;
      searchableView.searchTarget = secondTarget;
      assert.deepEqual(calls, [
        {target: 'first', view: null},
        {target: 'second', view: searchableView},
      ]);
    });

    it('does nothing when set to the same target', () => {
      const searchableView = new UI.SearchableView.SearchableView(createSearchable(), null);
      const refreshSpy = sinon.spy(searchableView, 'refreshSearch');
      const setSearchableView = sinon.spy();
      const target: UI.SearchableView.SearchTarget = {setSearchableView};

      searchableView.searchTarget = target;
      setSearchableView.resetHistory();
      refreshSpy.resetHistory();

      searchableView.searchTarget = target;
      sinon.assert.notCalled(setSearchableView);
      sinon.assert.notCalled(refreshSpy);
    });

    it('refreshes the search only while the search bar is visible', () => {
      const searchable = createSearchable();
      const searchableView = new UI.SearchableView.SearchableView(searchable, null);
      searchableView.minimalSearchQuerySize = 0;
      const firstTarget: UI.SearchableView.SearchTarget = {setSearchableView: sinon.spy()};
      const secondTarget: UI.SearchableView.SearchTarget = {setSearchableView: sinon.spy()};

      searchableView.searchTarget = firstTarget;
      sinon.assert.notCalled(searchable.performSearch as sinon.SinonSpy);

      searchableView.showSearchField();
      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field');
      assert.exists(searchInput);
      searchInput.value = 'needle';
      (searchable.performSearch as sinon.SinonSpy).resetHistory();

      searchableView.searchTarget = secondTarget;
      sinon.assert.calledOnce(searchable.performSearch as sinon.SinonSpy);
    });
  });

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
