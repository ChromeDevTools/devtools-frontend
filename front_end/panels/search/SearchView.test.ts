// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Search from './search.js';

interface PerformSearchArgs {
  searchConfig: Workspace.SearchConfig.SearchConfig;
  progress: Common.Progress.Progress;
  searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void;
  searchFinishedCallback: (arg0: boolean) => void;
}

class FakeSearchScope implements Search.SearchScope.SearchScope {
  readonly performSearchCalledPromise: Promise<PerformSearchArgs>;
  readonly #resolvePerformSearchCalledPromise: (args: PerformSearchArgs) => void;

  constructor() {
    const {promise, resolve} = Promise.withResolvers<PerformSearchArgs>();
    this.performSearchCalledPromise = promise;
    this.#resolvePerformSearchCalledPromise = resolve;
  }

  performSearch(
      searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress,
      searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void,
      searchFinishedCallback: (arg0: boolean) => void): void|Promise<void> {
    this.#resolvePerformSearchCalledPromise({searchConfig, progress, searchResultCallback, searchFinishedCallback});
  }

  performIndexing(progress: Common.Progress.Progress): void {
    setTimeout(() => {
      progress.done = true;
    }, 0);  // Allow microtasks to run.
  }

  stopSearch(): void {
  }
}

class TestSearchView extends Search.SearchView.SearchView {
  readonly #scopeCreator: () => Search.SearchScope.SearchScope;
  /**
   * `SearchView` resets and lazily re-creates the search results pane for each search.
   * To provide a fake instance we install a get/set accessor for the original property
   * that behaves normally with no override, but returns the mock if one is provided.
   */
  view: ViewFunctionStub<typeof Search.SearchView.SearchView>;

  constructor(scopeCreator: () => Search.SearchScope.SearchScope) {
    const view = createViewFunctionStub(Search.SearchView.SearchView);
    super('fake', view);
    this.view = view;
    this.#scopeCreator = scopeCreator;
  }

  override createScope(): Search.SearchScope.SearchScope {
    return this.#scopeCreator();
  }

  /** Fills in the UI elements of the SearchView and hits 'Enter'. */
  async triggerSearch(query: string, matchCase: boolean, isRegex: boolean): Promise<void> {
    const input = await this.view.nextInput;
    input.onQueryChange(query);
    if (matchCase) {
      input.onToggleMatchCase();
    }
    if (isRegex) {
      input.onToggleRegex();
    }

    input.onQueryKeyDown(new KeyboardEvent('keydown', {keyCode: UI.KeyboardShortcut.Keys.Enter.code}));
  }

  get currentSearchResultMessage(): string {
    return this.view.input.searchResultsMessage;
  }
}

function makeInput(query: string): Search.SearchView.SearchViewInput {
  return {
    query,
    matchCase: true,
    isRegex: true,
    searchConfig: null,
    searchMessage: '',
    searchResultsMessage: '',
    searchResults: [],
    progress: null,
    onQueryChange: () => {},
    onQueryKeyDown: () => {},
    onPanelKeyDown: () => {},
    onClearSearchInput: () => {},
    onToggleRegex: () => {},
    onToggleMatchCase: () => {},
    onRefresh: () => {},
    onClearSearch: () => {},
  };
}

function makeOutput(): Search.SearchView.SearchViewOutput {
  return {
    focusSearchInput: () => {},
    showAllMatches: () => {},
    collapseAllResults: () => {},
  };
}

describeWithEnvironment('SearchView view function', () => {
  it('has a standard placeholder when nothing has been searched yet', async () => {
    const input = makeInput('');
    const output = makeOutput();
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Search.SearchView.DEFAULT_VIEW(input, output, target);
    await assertScreenshot('search/no-search.png');
  });

  it('notifies the user when no search results were found', async () => {
    const input = makeInput('a query');
    const output = makeOutput();
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Search.SearchView.DEFAULT_VIEW(input, output, target);
    await assertScreenshot('search/no-results.png');
  });
});

describeWithEnvironment('SearchView', () => {
  it('calls the search scope with the search config provided by the user via the UI', async () => {
    const fakeScope = new FakeSearchScope();
    const searchView = new TestSearchView(() => fakeScope);

    await searchView.triggerSearch('a query', true, true);

    const {searchConfig} = await fakeScope.performSearchCalledPromise;
    assert.strictEqual(searchConfig.query(), 'a query');
    assert.isFalse(searchConfig.ignoreCase());
    assert.isTrue(searchConfig.isRegex());
  });

  it('has a standard placeholder when search has been cleared', async () => {
    const fakeScope = new FakeSearchScope();
    const searchView = new TestSearchView(() => fakeScope);

    await searchView.triggerSearch('a query', true, true);

    const {searchFinishedCallback} = await fakeScope.performSearchCalledPromise;
    searchFinishedCallback(/* finished */ true);

    // After search, shows that no matches were found.
    const afterSearch = await searchView.view.nextInput;
    assert.strictEqual(afterSearch.query, 'a query');
    assert.lengthOf(afterSearch.searchResults, 0);

    afterSearch.onClearSearch();

    // After clearing, shows standard placeholder.
    const afterClear = await searchView.view.nextInput;
    assert.strictEqual(afterClear.query, '');
    assert.lengthOf(afterClear.searchResults, 0);
  });

  it('updates the search result message with a count when search results are added', async () => {
    const fakeScope = new FakeSearchScope();
    const searchView = new TestSearchView(() => fakeScope);

    await searchView.triggerSearch('a query', true, true);

    const {searchResultCallback} = await fakeScope.performSearchCalledPromise;

    searchResultCallback({matchesCount: () => 10} as Search.SearchScope.SearchResult);
    await searchView.view.nextInput;
    assert.strictEqual(searchView.currentSearchResultMessage, 'Found 10 matching lines in 1 file.');

    searchResultCallback({matchesCount: () => 42} as Search.SearchScope.SearchResult);
    await searchView.view.nextInput;
    assert.strictEqual(searchView.currentSearchResultMessage, 'Found 52 matching lines in 2 files.');
  });

  it('forwards each SearchResult to the results pane', async () => {
    const fakeScope = new FakeSearchScope();
    const searchView = new TestSearchView(() => fakeScope);

    await searchView.triggerSearch('a query', true, true);

    const {searchResultCallback} = await fakeScope.performSearchCalledPromise;

    const searchResult1 = ({matchesCount: () => 10}) as Search.SearchScope.SearchResult;
    const searchResult2 = ({matchesCount: () => 42}) as Search.SearchScope.SearchResult;

    searchResultCallback(searchResult1);
    searchResultCallback(searchResult2);
    const afterSearch = await searchView.view.nextInput;

    assert.deepEqual(afterSearch.searchResults, [searchResult1, searchResult2]);
  });
});
