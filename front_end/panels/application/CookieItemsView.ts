// Copyright 2021 The Chromium Authors. All rights reserved.
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
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cookieItemsViewStyles from './cookieItemsView.css.js';
import {StorageItemsView} from './StorageItemsView.js';

const UIStrings = {
  /**
   *@description Label for checkbox to show URL-decoded cookie values
   */
  showUrlDecoded: 'Show URL-decoded',
  /**
   *@description Text for web cookies
   */
  cookies: 'Cookies',
  /**
   *@description Text in Cookie Items View of the Application panel
   */
  selectACookieToPreviewItsValue: 'Select a cookie to preview its value',
  /**
   *@description Text for filter in Cookies View of the Application panel
   */
  onlyShowCookiesWithAnIssue: 'Only show cookies with an issue',
  /**
   *@description Title for filter in the Cookies View of the Application panel
   */
  onlyShowCookiesWhichHaveAn: 'Only show cookies that have an associated issue',
  /**
   *@description Label to only delete the cookies that are visible after filtering
   */
  clearFilteredCookies: 'Clear filtered cookies',
  /**
   *@description Label to delete all cookies
   */
  clearAllCookies: 'Clear all cookies',
  /**
   *@description Alert message for screen reader to announce # of cookies in the table
   *@example {5} PH1
   */
  numberOfCookiesShownInTableS: 'Number of cookies shown in table: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/CookieItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
class CookiePreviewWidget extends UI.Widget.VBox {
  private cookie: SDK.Cookie.Cookie|null;
  private showDecodedSetting: Common.Settings.Setting<boolean>;
  private toggle: UI.UIUtils.CheckboxLabel;
  private value: HTMLDivElement;

  constructor() {
    super();
    this.setMinimumSize(230, 45);
    this.cookie = null;
    this.showDecodedSetting = Common.Settings.Settings.instance().createSetting('cookie-view-show-decoded', false);

    const header = document.createElement('div');
    header.classList.add('cookie-preview-widget-header');
    const span = document.createElement('span');
    span.classList.add('cookie-preview-widget-header-label');
    span.textContent = 'Cookie Value';
    header.appendChild(span);
    this.contentElement.appendChild(header);

    const toggle = UI.UIUtils.CheckboxLabel.create(
        i18nString(UIStrings.showUrlDecoded), this.showDecodedSetting.get(), undefined, 'show-url-decoded');
    toggle.classList.add('cookie-preview-widget-toggle');
    toggle.checkboxElement.addEventListener('click', () => this.showDecoded(!this.showDecodedSetting.get()));
    header.appendChild(toggle);
    this.toggle = toggle;

    const value = document.createElement('div');
    value.classList.add('cookie-preview-widget-cookie-value');
    value.textContent = '';
    value.addEventListener('dblclick', this.handleDblClickOnCookieValue.bind(this));
    this.value = value;

    this.contentElement.classList.add('cookie-preview-widget');
    this.contentElement.setAttribute('jslog', `${VisualLogging.section('cookie-preview')}`);
    this.contentElement.appendChild(value);
  }

  showDecoded(decoded: boolean): void {
    if (!this.cookie) {
      return;
    }
    this.showDecodedSetting.set(decoded);
    this.toggle.checkboxElement.checked = decoded;
    this.updatePreview();
  }

  private updatePreview(): void {
    if (this.cookie) {
      this.value.textContent =
          this.showDecodedSetting.get() ? decodeURIComponent(this.cookie.value()) : this.cookie.value();
    } else {
      this.value.textContent = '';
    }
  }

  setCookie(cookie: SDK.Cookie.Cookie): void {
    this.cookie = cookie;
    this.updatePreview();
  }

  /**
   * Select all text even if there a spaces in it
   */
  handleDblClickOnCookieValue(event: Event): void {
    event.preventDefault();
    const range = document.createRange();
    range.selectNode(this.value);
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export class CookieItemsView extends StorageItemsView {
  private model: SDK.CookieModel.CookieModel;
  private cookieDomain: string;
  private totalSize: number;
  private cookiesTable: CookieTable.CookiesTable.CookiesTable;
  private readonly splitWidget: UI.SplitWidget.SplitWidget;
  private readonly previewPanel: UI.Widget.VBox;
  private readonly previewWidget: CookiePreviewWidget;
  private readonly emptyWidget: UI.EmptyWidget.EmptyWidget;
  private onlyIssuesFilterUI: UI.Toolbar.ToolbarCheckbox;
  private readonly refreshThrottler: Common.Throttler.Throttler;
  private eventDescriptors: Common.EventTarget.EventDescriptor[];
  private allCookies: SDK.Cookie.Cookie[];
  private shownCookies: SDK.Cookie.Cookie[];
  private selectedCookie: SDK.Cookie.Cookie|null;
  constructor(model: SDK.CookieModel.CookieModel, cookieDomain: string) {
    super(i18nString(UIStrings.cookies), 'cookiesPanel');

    this.element.classList.add('storage-view');
    this.element.setAttribute('jslog', `${VisualLogging.pane('cookies-data')}`);

    this.model = model;
    this.cookieDomain = cookieDomain;

    this.totalSize = 0;
    this.cookiesTable = new CookieTable.CookiesTable.CookiesTable(
        /* renderInline */ false, this.saveCookie.bind(this), this.refreshItems.bind(this),
        this.handleCookieSelected.bind(this), this.deleteCookie.bind(this));

    this.cookiesTable.setMinimumSize(0, 50);

    this.splitWidget = new UI.SplitWidget.SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ true, 'cookie-items-split-view-state');
    this.splitWidget.show(this.element);

    this.previewPanel = new UI.Widget.VBox();
    this.previewPanel.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);
    const resizer = this.previewPanel.element.createChild('div', 'preview-panel-resizer');

    this.splitWidget.setMainWidget(this.cookiesTable);
    this.splitWidget.setSidebarWidget(this.previewPanel);
    this.splitWidget.installResizer(resizer);

    this.previewWidget = new CookiePreviewWidget();
    this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.selectACookieToPreviewItsValue));
    this.emptyWidget.show(this.previewPanel.contentElement);

    this.onlyIssuesFilterUI = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.onlyShowCookiesWithAnIssue), i18nString(UIStrings.onlyShowCookiesWhichHaveAn), () => {
          this.updateWithCookies(this.allCookies);
        }, 'only-show-cookies-with-issues');
    this.appendToolbarItem(this.onlyIssuesFilterUI);

    this.refreshThrottler = new Common.Throttler.Throttler(300);
    this.eventDescriptors = [];

    this.allCookies = [];
    this.shownCookies = [];
    this.selectedCookie = null;

    this.setCookiesDomain(model, cookieDomain);
  }

  setCookiesDomain(model: SDK.CookieModel.CookieModel, domain: string): void {
    this.model = model;
    this.cookieDomain = domain;
    this.refreshItems();
    Common.EventTarget.removeEventListeners(this.eventDescriptors);
    const networkManager = model.target().model(SDK.NetworkManager.NetworkManager);
    if (networkManager) {
      this.eventDescriptors = [
        networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this.onResponseReceived, this),
        networkManager.addEventListener(SDK.NetworkManager.Events.LoadingFinished, this.onLoadingFinished, this),
      ];
    }
  }

  private showPreview(cookie: SDK.Cookie.Cookie|null): void {
    if (cookie === this.selectedCookie) {
      return;
    }
    this.selectedCookie = cookie;

    if (!cookie) {
      this.previewWidget.detach();
      this.emptyWidget.show(this.previewPanel.contentElement);
    } else {
      this.emptyWidget.detach();
      this.previewWidget.setCookie(cookie);
      this.previewWidget.show(this.previewPanel.contentElement);
    }
  }

  private handleCookieSelected(): void {
    const cookie = this.cookiesTable.selectedCookie();
    this.setCanDeleteSelected(Boolean(cookie));

    this.showPreview(cookie);
  }

  private async saveCookie(newCookie: SDK.Cookie.Cookie, oldCookie: SDK.Cookie.Cookie|null): Promise<boolean> {
    if (oldCookie && newCookie.key() !== oldCookie.key()) {
      await this.model.deleteCookie(oldCookie);
    }
    return this.model.saveCookie(newCookie);
  }

  private deleteCookie(cookie: SDK.Cookie.Cookie, callback: () => void): void {
    void this.model.deleteCookie(cookie).then(callback);
  }

  private updateWithCookies(allCookies: SDK.Cookie.Cookie[]): void {
    this.allCookies = allCookies;
    this.totalSize = allCookies.reduce((size, cookie) => size + cookie.size(), 0);

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(this.cookieDomain);
    const host = parsedURL ? parsedURL.host : '';
    this.cookiesTable.setCookieDomain(host);

    this.shownCookies = this.filter(allCookies, cookie => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
    if (this.hasFilter()) {
      this.setDeleteAllTitle(i18nString(UIStrings.clearFilteredCookies));
      this.setDeleteAllGlyph('filter-clear');
    } else {
      this.setDeleteAllTitle(i18nString(UIStrings.clearAllCookies));
      this.setDeleteAllGlyph('clear-list');
    }
    this.cookiesTable.setCookies(this.shownCookies, this.model.getCookieToBlockedReasonsMap());
    UI.ARIAUtils.alert(i18nString(UIStrings.numberOfCookiesShownInTableS, {PH1: this.shownCookies.length}));
    this.setCanFilter(true);
    this.setCanDeleteAll(this.shownCookies.length > 0);
    this.setCanDeleteSelected(Boolean(this.cookiesTable.selectedCookie()));

    if (!this.cookiesTable.selectedCookie()) {
      this.showPreview(null);
    }
  }

  override filter<T>(items: T[], keyFunction: (arg0: T) => string): T[] {
    const predicate = (object: T|null): boolean => {
      if (!this.onlyIssuesFilterUI.checked()) {
        return true;
      }
      if (object instanceof SDK.Cookie.Cookie) {
        return IssuesManager.RelatedIssue.hasIssues(object);
      }
      return false;
    };
    return super.filter(items, keyFunction).filter(predicate);
  }

  /**
   * This will only delete the currently visible cookies.
   */
  override deleteAllItems(): void {
    this.showPreview(null);
    void this.model.deleteCookies(this.shownCookies).then(() => this.refreshItems());
  }

  override deleteSelectedItem(): void {
    const selectedCookie = this.cookiesTable.selectedCookie();
    if (selectedCookie) {
      this.showPreview(null);
      void this.model.deleteCookie(selectedCookie).then(() => this.refreshItems());
    }
  }

  override refreshItems(): void {
    void this.model.getCookiesForDomain(this.cookieDomain).then(this.updateWithCookies.bind(this));
  }

  refreshItemsThrottled(): void {
    void this.refreshThrottler.schedule(() => Promise.resolve(this.refreshItems()));
  }

  private onResponseReceived(): void {
    this.refreshItemsThrottled();
  }

  private onLoadingFinished(): void {
    this.refreshItemsThrottled();
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cookieItemsViewStyles]);
  }
}
