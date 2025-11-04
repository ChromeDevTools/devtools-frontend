// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Search from '../search/search.js';
import { SourcesSearchScope } from './SourcesSearchScope.js';
export class SearchSources {
    query;
    constructor(query) {
        this.query = query;
    }
}
export class SearchSourcesView extends Search.SearchView.SearchView {
    constructor() {
        super('sources');
    }
    createScope() {
        return new SourcesSearchScope();
    }
}
export class ActionDelegate {
    handleAction(_context, actionId) {
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
export class Revealer {
    async reveal({ query }, omitFocus) {
        const viewManager = UI.ViewManager.ViewManager.instance();
        await viewManager.showView('sources.search-sources-tab', true, omitFocus);
        const searchSourcesView = viewManager.materializedWidget('sources.search-sources-tab');
        if (searchSourcesView instanceof SearchSourcesView) {
            searchSourcesView.toggle(query);
        }
    }
}
//# sourceMappingURL=SearchSourcesView.js.map