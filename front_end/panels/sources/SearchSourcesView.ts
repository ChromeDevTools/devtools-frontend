// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Search from '../search/search.js';

import {SourcesSearchScope} from './SourcesSearchScope.js';

export class SearchSources {
  readonly query: string;
  constructor(query: string) {
    this.query = query;
  }
}

export class SearchSourcesView extends Search.SearchView.SearchView {
  constructor() {
    super('sources', new Common.Throttler.Throttler(/* timeoutMs */ 200));
  }

  override createScope(): Search.SearchScope.SearchScope {
    return new SourcesSearchScope();
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'sources.search': {
        const selection = UI.InspectorView.InspectorView.instance().element.window().getSelection();
        const query = selection ? selection.toString().replace(/\r?\n.*/, '') : '';
        void Common.Revealer.reveal(new SearchSources(query));
        return true;
      }
    }
    return false;
  }
}

export class Revealer implements Common.Revealer.Revealer<SearchSources> {
  async reveal({query}: SearchSources, omitFocus?: boolean|undefined): Promise<void> {
    const viewManager = UI.ViewManager.ViewManager.instance();
    await viewManager.showView('sources.search-sources-tab', true, omitFocus);
    const searchSourcesView = viewManager.materializedWidget('sources.search-sources-tab');
    if (searchSourcesView instanceof SearchSourcesView) {
      searchSourcesView.toggle(query);
    }
  }
}
