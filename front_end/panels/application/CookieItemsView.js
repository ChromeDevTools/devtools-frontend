// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2009 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import cookieItemsViewStyles from './cookieItemsView.css.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
const UIStrings = {
    /**
     * @description Label for checkbox to show URL-decoded cookie values
     */
    showUrlDecoded: 'Show URL-decoded',
    /**
     * @description Text in Cookie Items View of the Application panel to indicate that no cookie has been selected for preview
     */
    noCookieSelected: 'No cookie selected',
    /**
     * @description Text in Cookie Items View of the Application panel
     */
    selectACookieToPreviewItsValue: 'Select a cookie to preview its value',
    /**
     * @description Text for filter in Cookies View of the Application panel
     */
    onlyShowCookiesWithAnIssue: 'Only show cookies with an issue',
    /**
     * @description Title for filter in the Cookies View of the Application panel
     */
    onlyShowCookiesWhichHaveAn: 'Only show cookies that have an associated issue',
    /**
     * @description Label to only delete the cookies that are visible after filtering
     */
    clearFilteredCookies: 'Clear filtered cookies',
    /**
     * @description Label to delete all cookies
     */
    clearAllCookies: 'Clear all cookies',
    /**
     * @description Alert message for screen reader to announce # of cookies in the table
     * @example {5} PH1
     */
    numberOfCookiesShownInTableS: 'Number of cookies shown in table: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/CookieItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { Size } = Geometry;
const { widget } = UI.Widget;
export const DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW = (input, output, target) => {
    const cookieValue = input.cookie ? (input.showDecoded ? decodeURIComponent(input.cookie.value()) : input.cookie.value()) : '';
    function handleDblClickOnCookieValue(event) {
        event.preventDefault();
        const range = document.createRange();
        range.selectNode(event.currentTarget);
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
        selection.addRange(range);
    }
    // clang-format off
    render(html `<style>${cookieItemsViewStyles}</style>
    <div class="cookie-preview-widget">
      <div class="cookie-preview-widget-header">
        <span class="cookie-preview-widget-header-label">Cookie Value</span>
        <devtools-checkbox
          .checked=${input.showDecoded}
          @change=${(e) => input.onShowDecodedChanged(e.target.checked)}
          title=${i18nString(UIStrings.showUrlDecoded)}
          jslog=${VisualLogging.toggle('show-url-decoded').track({ click: true })}>
          ${i18nString(UIStrings.showUrlDecoded)}
        </devtools-checkbox>
      </div>
      <div class="cookie-preview-widget-cookie-value"
          @dblclick=${handleDblClickOnCookieValue}>
        ${cookieValue}
      </div>
    </div>
  `, 
    // clang-format on
    target);
};
class CookiePreviewWidget extends UI.Widget.VBox {
    view;
    #cookie;
    showDecodedSetting;
    constructor(element, view = DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW) {
        super(element, { jslog: `${VisualLogging.section('cookie-preview')}` });
        this.view = view;
        this.setMinimumSize(230, 45);
        this.#cookie = null;
        this.showDecodedSetting = Common.Settings.Settings.instance().createSetting('cookie-view-show-decoded', false);
        this.requestUpdate();
    }
    set cookie(cookie) {
        this.#cookie = cookie;
        this.requestUpdate();
    }
    performUpdate() {
        const input = {
            cookie: this.#cookie,
            showDecoded: this.showDecodedSetting.get(),
            onShowDecodedChanged: (showDecoded) => {
                this.showDecodedSetting.set(showDecoded);
                this.requestUpdate();
            },
        };
        this.view(input, undefined, this.contentElement);
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `<style>${cookieItemsViewStyles}</style>
    <devtools-widget class="storage-view" ${widget(UI.Widget.VBox, { minimumSize: new Size(0, 50) })}>
      <devtools-widget ${widget(StorageItemsToolbar, {
        onDeleteSelectedCallback: input.onDeleteSelectedItems,
        onDeleteAllCallback: input.onDeleteAllItems,
        onRefreshCallback: input.onRefreshItems,
    })}
        class=flex-none
        ${UI.Widget.widgetRef(StorageItemsToolbar, toolbar => { output.toolbar = toolbar; })}
      ></devtools-widget>
      <devtools-split-view sidebar-position="second" name="cookie-items-split-view-state">
        <devtools-widget slot="main" ${widget(UI.Widget.VBox, { minimumSize: new Size(0, 50) })}>
          <devtools-widget slot="main" ${widget(CookieTable.CookiesTable.CookiesTable, {
        cookieDomain: input.cookieDomain,
        cookiesData: input.cookiesData,
        saveCallback: input.onSaveCookie,
        refreshCallback: input.onRefresh,
        selectedCallback: input.onSelect,
        deleteCallback: input.onDelete,
        editable: true,
    })}
          ></devtools-widget>
        </devtools-widget>
        <devtools-widget slot="sidebar" ${widget(UI.Widget.VBox, { minimumSize: new Size(0, 50) })}
          jslog=${VisualLogging.pane('preview').track({ resize: true })}>
          ${input.selectedCookie ?
        html `<devtools-widget ${widget(CookiePreviewWidget, { cookie: input.selectedCookie })}>
                 </devtools-widget>` :
        html `<devtools-widget ${widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.noCookieSelected),
            text: i18nString(UIStrings.selectACookieToPreviewItsValue)
        })}></devtools-widget>`}
        </devtools-widget>
      </devtools-split-view>
    </devtools-widget>
  `, 
    // clang-format on
    target);
};
export class CookieItemsView extends UI.Widget.VBox {
    view;
    model;
    cookieDomain;
    onlyIssuesFilterUI;
    allCookies;
    shownCookies;
    selectedCookie;
    #toolbar;
    constructor(model, cookieDomain, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('cookies-data')}` });
        this.view = view;
        this.model = model;
        this.cookieDomain = cookieDomain;
        this.onlyIssuesFilterUI = new UI.Toolbar.ToolbarCheckbox(i18nString(UIStrings.onlyShowCookiesWithAnIssue), i18nString(UIStrings.onlyShowCookiesWhichHaveAn), () => {
            this.updateWithCookies(this.allCookies);
        }, 'only-show-cookies-with-issues');
        this.allCookies = [];
        this.shownCookies = [];
        this.selectedCookie = null;
        this.setCookiesDomain(model, cookieDomain);
        this.requestUpdate();
    }
    setCookiesDomain(model, domain) {
        this.model.removeEventListener("CookieListUpdated" /* SDK.CookieModel.Events.COOKIE_LIST_UPDATED */, this.onCookieListUpdate, this);
        this.model = model;
        this.cookieDomain = domain;
        this.refreshItems();
        this.model.addEventListener("CookieListUpdated" /* SDK.CookieModel.Events.COOKIE_LIST_UPDATED */, this.onCookieListUpdate, this);
    }
    performUpdate() {
        const that = this;
        const output = {
            set toolbar(toolbar) {
                if (that.#toolbar === toolbar) {
                    return;
                }
                that.#toolbar = toolbar;
                that.#toolbar.appendToolbarItem(that.onlyIssuesFilterUI);
                that.updateWithCookies(that.allCookies);
            },
        };
        const cookiesData = {
            cookies: this.shownCookies,
            cookieToBlockedReasons: this.model.getCookieToBlockedReasonsMap(),
        };
        const parsedURL = Common.ParsedURL.ParsedURL.fromString(this.cookieDomain);
        const host = parsedURL ? parsedURL.host : '';
        const input = {
            cookieDomain: host,
            cookiesData,
            onSaveCookie: this.saveCookie.bind(this),
            onRefresh: this.refreshItems.bind(this),
            onSelect: this.handleCookieSelected.bind(this),
            onDelete: this.deleteCookie.bind(this),
            onDeleteSelectedItems: this.deleteSelectedItem.bind(this),
            onDeleteAllItems: this.deleteAllItems.bind(this),
            onRefreshItems: this.refreshItems.bind(this),
            selectedCookie: this.selectedCookie,
        };
        this.view(input, output, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.refreshItems();
    }
    showPreview(cookie) {
        if (cookie === this.selectedCookie) {
            return;
        }
        this.selectedCookie = cookie;
        this.requestUpdate();
    }
    handleCookieSelected(selectedCookie) {
        if (!this.#toolbar) {
            return;
        }
        this.#toolbar.setCanDeleteSelected(Boolean(selectedCookie));
        this.showPreview(selectedCookie);
    }
    async saveCookie(newCookie, oldCookie) {
        if (oldCookie && newCookie.key() !== oldCookie.key()) {
            await this.model.deleteCookie(oldCookie);
        }
        return await this.model.saveCookie(newCookie);
    }
    deleteCookie(cookie, callback) {
        void this.model.deleteCookie(cookie).then(callback);
    }
    updateWithCookies(allCookies) {
        if (!this.#toolbar) {
            return;
        }
        this.allCookies = allCookies;
        this.shownCookies = this.filter(allCookies, cookie => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
        if (this.#toolbar.hasFilter()) {
            this.#toolbar.setDeleteAllTitle(i18nString(UIStrings.clearFilteredCookies));
            this.#toolbar.setDeleteAllGlyph('filter-clear');
        }
        else {
            this.#toolbar.setDeleteAllTitle(i18nString(UIStrings.clearAllCookies));
            this.#toolbar.setDeleteAllGlyph('clear-list');
        }
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.numberOfCookiesShownInTableS, { PH1: this.shownCookies.length }));
        this.#toolbar.setCanFilter(true);
        this.#toolbar.setCanDeleteAll(this.shownCookies.length > 0);
        this.#toolbar.setCanDeleteSelected(Boolean(this.selectedCookie));
        this.requestUpdate();
    }
    filter(items, keyFunction) {
        const predicate = (object) => {
            if (!this.onlyIssuesFilterUI.checked()) {
                return true;
            }
            if (object instanceof SDK.Cookie.Cookie) {
                return IssuesManager.RelatedIssue.hasIssues(object);
            }
            return false;
        };
        return items.filter(item => this.#toolbar?.filterRegex?.test(keyFunction(item)) ?? true).filter(predicate);
    }
    /**
     * This will only delete the currently visible cookies.
     */
    deleteAllItems() {
        this.showPreview(null);
        void this.model.deleteCookies(this.shownCookies);
    }
    deleteSelectedItem() {
        if (this.selectedCookie) {
            this.showPreview(null);
            void this.model.deleteCookie(this.selectedCookie);
        }
    }
    onCookieListUpdate() {
        void this.model.getCookiesForDomain(this.cookieDomain).then(this.updateWithCookies.bind(this));
    }
    refreshItems() {
        void this.model.getCookiesForDomain(this.cookieDomain, true).then(this.updateWithCookies.bind(this));
    }
}
//# sourceMappingURL=CookieItemsView.js.map