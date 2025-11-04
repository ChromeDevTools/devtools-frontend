import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Search from '../search/search.js';
export declare class SearchSources {
    readonly query: string;
    constructor(query: string);
}
export declare class SearchSourcesView extends Search.SearchView.SearchView {
    constructor();
    createScope(): Search.SearchScope.SearchScope;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class Revealer implements Common.Revealer.Revealer<SearchSources> {
    reveal({ query }: SearchSources, omitFocus?: boolean | undefined): Promise<void>;
}
