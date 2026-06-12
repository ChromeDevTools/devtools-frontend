// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Side-effect import: registers the `<devtools-menu-button>` custom element
// used by `PLUS_BUTTON_VIEW` below. The named imports are type-only.
import './ContextMenu.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import { Directives, html, render } from '../lit/lit.js';
const UIStrings = {
    /**
     * @description Default tooltip / accessible name of the "plus" button shown
     * after the visible tabs in a tab strip. Clicking it opens a menu listing
     * tools that are not currently shown as a visible tab.
     */
    moreTools: 'More tools',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/PlusButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * Presenter (MVP) for the plus-button menu. {@link buildModel} is called
 * fresh on every menu open so newly-registered views — or views that
 * just left the visible tab strip — are reflected immediately.
 */
export class PlusButtonPresenter {
    #context;
    constructor(context) {
        this.#context = context;
    }
    buildModel() {
        const { tabbedPane, location, views, manager } = this.#context;
        const overflowTabs = tabbedPane.hiddenTabs().map(tab => ({ id: tab.id, title: tab.title, jslogContext: tab.jslogContext }));
        const addToolEntries = [];
        // Seed dedup sets from the overflowed tabs so an addable entry
        // (e.g. a closeable view in the other main location) sharing an id
        // or title with an overflowed tab is not listed twice.
        const seenIds = new Set(overflowTabs.map(tab => tab.id));
        const seenTitles = new Set(overflowTabs.map(tab => tab.title));
        for (const view of views()) {
            // Skip views that already have a tab. Hidden tabs are already listed
            // in the overflow section above, and visible tabs are accessible
            // directly in the tab strip. Track their id and title so the
            // cross-location loop below cannot offer a same-titled duplicate
            // (e.g. drawer "Console" while the panel "Console" is already
            // visible — they have different view ids).
            if (tabbedPane.hasTab(view.viewId())) {
                seenIds.add(view.viewId());
                seenTitles.add(view.title());
                continue;
            }
            // Transient views are not user-addable.
            if (view.isTransient()) {
                continue;
            }
            if (seenIds.has(view.viewId()) || seenTitles.has(view.title())) {
                continue;
            }
            seenIds.add(view.viewId());
            seenTitles.add(view.title());
            const isIssuesPane = view.viewId() === 'issues-pane';
            addToolEntries.push({
                title: view.title(),
                jslogContext: view.viewId(),
                isPreviewFeature: view.isPreviewFeature(),
                action: () => {
                    if (isIssuesPane) {
                        // Distinct from `HAMBURGER_MENU` so plus-button opens are
                        // not conflated with three-dot-menu opens in the dashboard.
                        Host.userMetrics.issuesPanelOpenedFrom(6 /* Host.UserMetrics.IssueOpener.MORE_TOOLS_MENU */);
                    }
                    this.#context.showView(view);
                },
            });
        }
        // Offer cross-location moves between the two main surfaces: the
        // panel plus button lists drawer views and vice versa.
        const otherLocation = location === "panel" /* ViewLocationValues.PANEL */ ? "drawer-view" /* ViewLocationValues.DRAWER_VIEW */ :
            location === "drawer-view" /* ViewLocationValues.DRAWER_VIEW */ ? "panel" /* ViewLocationValues.PANEL */ :
                null;
        if (otherLocation) {
            for (const view of manager.viewsForLocation(otherLocation)) {
                // Non-closeable views (e.g. Console) cannot be moved between
                // locations, so they're excluded here. They still appear in the
                // overflow section when their own location's tab strip overflows.
                if (view.isTransient() || !view.isCloseable() || seenIds.has(view.viewId()) || seenTitles.has(view.title())) {
                    continue;
                }
                seenIds.add(view.viewId());
                seenTitles.add(view.title());
                const viewId = view.viewId();
                addToolEntries.push({
                    title: view.title(),
                    jslogContext: viewId,
                    isPreviewFeature: view.isPreviewFeature(),
                    action: () => manager.moveView(viewId, location),
                });
            }
        }
        addToolEntries.sort((a, b) => a.title.localeCompare(b.title));
        return { overflowTabs, addToolEntries };
    }
}
/**
 * Renders the plus-button menu by asking {@link PlusButtonPresenter}
 * for a model and pushing it into `contextMenu`. Overflowed tabs (in
 * tab order) come first, followed by deduplicated "add tool" entries
 * sorted alphabetically.
 */
export function populatePlusButtonMenu(contextMenu, context) {
    const model = new PlusButtonPresenter(context).buildModel();
    const hasOverflow = model.overflowTabs.length > 0;
    // When there are no overflowed tabs, surface the add-tool entries in
    // the default section so they are not visually demoted to a footer.
    for (const tab of model.overflowTabs) {
        contextMenu.defaultSection().appendItem(tab.title, () => revealOverflowTab(context.tabbedPane, tab.id), { jslogContext: tab.jslogContext ?? tab.id });
    }
    const addToolSection = hasOverflow ? contextMenu.footerSection() : contextMenu.defaultSection();
    for (const entry of model.addToolEntries) {
        addToolSection.appendItem(entry.title, entry.action, { isPreviewFeature: entry.isPreviewFeature, jslogContext: entry.jslogContext });
    }
}
/**
 * Reveals an overflowed tab and persists its new position via
 * `moveTab(firstHidden - 1)` so the tab stays in the visible region
 * after a reload — independent of any runtime `currentTab` /
 * `lastSelectedOverflowTab` priority logic. The previously-last-visible
 * tab is pushed to the start of the overflow region, matching the
 * intuition that the newly opened tab replaces the one the user
 * implicitly stopped using.
 *
 * Exported only for testing.
 */
export function revealOverflowTab(tabbedPane, tabId) {
    const firstHidden = tabbedPane.firstHiddenTabIndex();
    if (firstHidden > 0) {
        // `firstHidden - 1` is the index of the last currently-visible tab.
        tabbedPane.moveTab(tabId, firstHidden - 1);
    }
    tabbedPane.selectTab(tabId, /* userGesture */ true, /* forceFocus */ true);
}
/**
 * Standard `(input, output, target)` view function so `Lit.render` is
 * called inside a view (per `@devtools/no-lit-render-outside-of-view`).
 * `output.button` is captured via `ref` to avoid a `querySelector`
 * round-trip in {@link installPlusButton}.
 *
 * `slot` is set declaratively in the template so the attribute is
 * present on the very first connection — the first `slotchange` then
 * sees the button as the trailing-slot target and no extra layout pass
 * is needed.
 */
export const PLUS_BUTTON_VIEW = (input, output, target) => {
    render(html `
        <devtools-menu-button
            ${Directives.ref(el => {
        output.button = el;
    })}
            slot="trailing-button"
            .iconName=${'plus'}
            .title=${input.title}
            .jslogContext=${input.jslogContext}
            .populateMenuCall=${input.populateMenuCall}>
        </devtools-menu-button>`, target);
};
/**
 * Renders a `<devtools-menu-button>` configured as the plus button into
 * `tabbedPane`'s `trailing-button` slot and returns the slotted host.
 * The returned `MenuButton` is used by the next CL to toggle visibility
 * (e.g. when the drawer is minimized).
 */
export function installPlusButton(context, options = {}) {
    const output = {};
    // `render` is synchronous and the `ref` directive fires during render,
    // so `output.button` is assigned by the time the view returns.
    PLUS_BUTTON_VIEW({
        title: options.title ?? i18nString(UIStrings.moreTools),
        jslogContext: options.jslogContext ?? '',
        populateMenuCall: menu => populatePlusButtonMenu(menu, context),
    }, output, context.tabbedPane.element);
    if (!output.button) {
        throw new Error('installPlusButton: ref directive did not capture <devtools-menu-button>');
    }
    return output.button;
}
//# sourceMappingURL=PlusButton.js.map