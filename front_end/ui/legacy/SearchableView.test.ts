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

  describe('placeholder', () => {
    it('updates the search input placeholder', () => {
      const searchableView = new UI.SearchableView.SearchableView(createSearchable(), null);
      searchableView.placeholder = 'Find by string, selector, or XPath';
      assert.strictEqual(searchableView.placeholder, 'Find by string, selector, or XPath');
      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field');
      assert.strictEqual(searchInput?.placeholder, 'Find by string, selector, or XPath');
    });
  });

  describe('search and navigation', () => {
    it('performs search on Enter and jumps to next/previous results on subsequent Enters or buttons', () => {
      const searchable = createSearchable();
      searchable.supportsMatchCounts = () => true;
      const searchableView = new UI.SearchableView.SearchableView(searchable, null);
      searchableView.showSearchField();

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.value = 'hi';

      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      sinon.assert.calledOnceWithExactly(
          searchable.performSearch as sinon.SinonSpy,
          sinon.match({query: 'hi', caseSensitive: false, wholeWord: false, isRegex: false}), true, false);

      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      sinon.assert.calledOnce(searchable.jumpToNextSearchResult as sinon.SinonSpy);

      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', shiftKey: true}));
      sinon.assert.calledOnce(searchable.jumpToPreviousSearchResult as sinon.SinonSpy);

      searchableView.updateSearchMatchesCount(3);
      const prevButton =
          searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Show previous result"]')!;
      const nextButton = searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Show next result"]')!;
      prevButton.click();
      sinon.assert.calledTwice(searchable.jumpToPreviousSearchResult as sinon.SinonSpy);
      nextButton.click();
      sinon.assert.calledTwice(searchable.jumpToNextSearchResult as sinon.SinonSpy);
    });

    it('clears search when clear button is clicked or query is emptied', () => {
      const searchable = createSearchable();
      const searchableView = new UI.SearchableView.SearchableView(searchable, null);
      searchableView.minimalSearchQuerySize = 1;
      searchableView.showSearchField();

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.value = 'test';
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      sinon.assert.calledOnce(searchable.performSearch as sinon.SinonSpy);

      const clearButton =
          searchableView.contentElement.querySelector<HTMLElement>('.search-config-buttons .clear-button')!;
      clearButton.click();
      assert.strictEqual(searchInput.value, '');
      sinon.assert.calledOnce(searchable.onSearchCanceled as sinon.SinonSpy);
    });

    it('closes search bar on Escape or close button click and notifies searchProvider', () => {
      const searchable = createSearchable();
      searchable.onSearchClosed = sinon.spy();
      const searchableView = new UI.SearchableView.SearchableView(searchable, null);
      searchableView.showSearchField();

      const searchBar = searchableView.contentElement.querySelector<HTMLElement>('.search-bar')!;
      assert.isFalse(searchBar.classList.contains('hidden'));

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      assert.isTrue(searchBar.classList.contains('hidden'));
      sinon.assert.calledOnce(searchable.onSearchClosed as sinon.SinonSpy);

      searchableView.showSearchField();
      assert.isFalse(searchBar.classList.contains('hidden'));
      const closeButton = searchableView.contentElement.querySelector<HTMLElement>('.close-search-button')!;
      closeButton.click();
      assert.isTrue(searchBar.classList.contains('hidden'));
      sinon.assert.calledTwice(searchable.onSearchClosed as sinon.SinonSpy);
    });
  });

  describe('match counts and current match index', () => {
    it('formats match counts for 0, 1, multiple matches, and active match index', () => {
      const searchable = createSearchable();
      const searchableView = new UI.SearchableView.SearchableView(searchable, null);
      searchableView.minimalSearchQuerySize = 1;
      searchableView.showSearchField();

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.value = 'foo';
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

      const matchesEl = searchableView.contentElement.querySelector<HTMLElement>('.search-results-matches')!;

      searchableView.updateSearchMatchesCount(0);
      assert.strictEqual(matchesEl.textContent, '0 of 0');

      searchableView.updateSearchMatchesCount(1);
      assert.strictEqual(matchesEl.textContent, '1 match');

      searchableView.updateSearchMatchesCount(5);
      assert.strictEqual(matchesEl.textContent, '5 matches');

      searchableView.updateCurrentMatchIndex(2);
      assert.strictEqual(matchesEl.textContent, '3 of 5');
    });
  });

  describe('search config toggles and settings', () => {
    it('toggles caseSensitive, wholeWord, and isRegex and persists them to setting', () => {
      const searchable = createSearchable();
      const searchableView = new UI.SearchableView.SearchableView(searchable, null, 'test-search-config');
      searchableView.minimalSearchQuerySize = 1;
      searchableView.showSearchField();

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.value = 'foo';

      const caseButton = searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Match case"]')!;
      const wordButton = searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Match whole word"]')!;
      const regexButton =
          searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Use regular expression"]')!;

      caseButton.click();
      sinon.assert.calledWithMatch(searchable.performSearch as sinon.SinonSpy,
                                   {query: 'foo', caseSensitive: true, wholeWord: false, isRegex: false});

      wordButton.click();
      sinon.assert.calledWithMatch(searchable.performSearch as sinon.SinonSpy,
                                   {query: 'foo', caseSensitive: true, wholeWord: true, isRegex: false});

      regexButton.click();
      sinon.assert.calledWithMatch(searchable.performSearch as sinon.SinonSpy,
                                   {query: 'foo', caseSensitive: true, wholeWord: true, isRegex: true});

      const restoredView = new UI.SearchableView.SearchableView(searchable, null, 'test-search-config');
      restoredView.minimalSearchQuerySize = 1;
      restoredView.showSearchField();
      const restoredInput = restoredView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      restoredInput.value = 'bar';
      (searchable.performSearch as sinon.SinonSpy).resetHistory();
      restoredInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      sinon.assert.calledWithMatch(searchable.performSearch as sinon.SinonSpy,
                                   {query: 'bar', caseSensitive: true, wholeWord: true, isRegex: true});
    });
  });

  describe('replace and replaceAll', () => {
    it('toggles replace row and invokes replaceSelectionWith and replaceAllWith', () => {
      const searchable = createSearchable();
      const replaceable: UI.SearchableView.Replaceable = {
        replaceSelectionWith: sinon.spy(),
        replaceAllWith: sinon.spy(),
      };
      const searchableView = new UI.SearchableView.SearchableView(searchable, replaceable);
      searchableView.replaceable = true;
      searchableView.minimalSearchQuerySize = 1;
      searchableView.showSearchField();

      const searchBar = searchableView.contentElement.querySelector<HTMLElement>('.search-bar')!;
      assert.isFalse(searchBar.classList.contains('replaceable'));

      const replaceToggle =
          searchableView.contentElement.querySelector<HTMLElement>('[aria-label="Find and replace"]')!;
      replaceToggle.click();
      assert.isTrue(searchBar.classList.contains('replaceable'));

      const searchInput = searchableView.contentElement.querySelector<HTMLInputElement>('#search-input-field')!;
      searchInput.value = 'old';
      searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      searchableView.updateSearchMatchesCount(2);

      const replaceInput =
          searchableView.contentElement.querySelector<HTMLInputElement>('.replace-element input.search-replace')!;
      replaceInput.value = 'new';

      const [replaceButton, replaceAllButton] =
          searchableView.contentElement.querySelectorAll<HTMLButtonElement>('.second-row-buttons devtools-button');
      assert.isFalse(replaceButton.disabled);
      assert.isFalse(replaceAllButton.disabled);

      replaceButton.click();
      sinon.assert.calledOnceWithExactly(replaceable.replaceSelectionWith as sinon.SinonSpy,
                                         sinon.match({query: 'old'}), 'new');

      replaceAllButton.click();
      sinon.assert.calledOnceWithExactly(replaceable.replaceAllWith as sinon.SinonSpy, sinon.match({query: 'old'}),
                                         'new');
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
