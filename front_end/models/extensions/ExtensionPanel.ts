/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as _ProtocolClient from '../../core/protocol_client/protocol_client.js';  // eslint-disable-line @typescript-eslint/no-unused-vars
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as ExtensionAPI from './ExtensionAPI.js';
import {type ExtensionServer} from './ExtensionServer.js';
import {ExtensionNotifierView, ExtensionView} from './ExtensionView.js';

export class ExtensionPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable {
  private readonly server: ExtensionServer;
  private readonly id: string;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  private readonly searchableViewInternal: UI.SearchableView.SearchableView;

  constructor(server: ExtensionServer, panelName: string, id: string, pageURL: string) {
    super(panelName);
    this.server = server;
    this.id = id;
    this.setHideOnDetach();
    this.panelToolbar = new UI.Toolbar.Toolbar('hidden', this.element);

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.show(this.element);

    const extensionView = new ExtensionView(server, this.id, pageURL, 'extension');
    extensionView.show(this.searchableViewInternal.element);
  }

  addToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this.panelToolbar.element.classList.remove('hidden');
    this.panelToolbar.appendToolbarItem(item);
  }

  onSearchCanceled(): void {
    this.server.notifySearchAction(this.id, ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch);
    this.searchableViewInternal.updateSearchMatchesCount(0);
  }

  override searchableView(): UI.SearchableView.SearchableView {
    return this.searchableViewInternal;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void {
    const query = searchConfig.query;
    this.server.notifySearchAction(this.id, ExtensionAPI.PrivateAPI.Panels.SearchAction.PerformSearch, query);
  }

  jumpToNextSearchResult(): void {
    this.server.notifySearchAction(this.id, ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult);
  }

  jumpToPreviousSearchResult(): void {
    this.server.notifySearchAction(this.id, ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult);
  }

  supportsCaseSensitiveSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }
}

export class ExtensionButton {
  private readonly id: string;
  private readonly toolbarButtonInternal: UI.Toolbar.ToolbarButton;
  constructor(server: ExtensionServer, id: string, iconURL: string, tooltip?: string, disabled?: boolean) {
    this.id = id;

    this.toolbarButtonInternal = new UI.Toolbar.ToolbarButton('', '');
    this.toolbarButtonInternal.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, server.notifyButtonClicked.bind(server, this.id));
    this.update(iconURL, tooltip, disabled);
  }

  update(iconURL?: string, tooltip?: string, disabled?: boolean): void {
    if (typeof iconURL === 'string') {
      this.toolbarButtonInternal.setBackgroundImage(iconURL);
    }
    if (typeof tooltip === 'string') {
      this.toolbarButtonInternal.setTitle(tooltip);
    }
    if (typeof disabled === 'boolean') {
      this.toolbarButtonInternal.setEnabled(!disabled);
    }
  }

  toolbarButton(): UI.Toolbar.ToolbarButton {
    return this.toolbarButtonInternal;
  }
}

export class ExtensionSidebarPane extends UI.View.SimpleView {
  private readonly panelNameInternal: string;
  private server: ExtensionServer;
  private idInternal: string;
  private extensionView?: ExtensionView;
  private objectPropertiesView?: ExtensionNotifierView;
  constructor(server: ExtensionServer, panelName: string, title: Platform.UIString.LocalizedString, id: string) {
    super(title);
    this.element.classList.add('fill');
    this.panelNameInternal = panelName;
    this.server = server;
    this.idInternal = id;
  }

  id(): string {
    return this.idInternal;
  }

  panelName(): string {
    return this.panelNameInternal;
  }

  setObject(object: Object, title: string|undefined, callback: (arg0?: (string|null)|undefined) => void): void {
    this.createObjectPropertiesView();
    this.setObjectInternal(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
  }

  setExpression(
      expression: string, title: string|undefined, evaluateOptions: Object|undefined, securityOrigin: string,
      callback: (arg0?: (string|null)|undefined) => void): void {
    this.createObjectPropertiesView();
    this.server.evaluate(
        expression, true, false, evaluateOptions, securityOrigin, this.onEvaluate.bind(this, title, callback));
  }

  setPage(url: Platform.DevToolsPath.UrlString): void {
    if (this.objectPropertiesView) {
      this.objectPropertiesView.detach();
      delete this.objectPropertiesView;
    }
    if (this.extensionView) {
      this.extensionView.detach(true);
    }

    this.extensionView = new ExtensionView(this.server, this.idInternal, url, 'extension fill');
    this.extensionView.show(this.element);

    if (!this.element.style.height) {
      this.setHeight('150px');
    }
  }

  setHeight(height: string): void {
    this.element.style.height = height;
  }

  private onEvaluate(
      title: string|undefined, callback: (arg0?: (string|null)|undefined) => void, error: string|null,
      result: SDK.RemoteObject.RemoteObject|null, _wasThrown?: boolean): void {
    if (error) {
      callback(error.toString());
    } else if (!result) {
      callback();
    } else {
      this.setObjectInternal(result, title, callback);
    }
  }

  private createObjectPropertiesView(): void {
    if (this.objectPropertiesView) {
      return;
    }
    if (this.extensionView) {
      this.extensionView.detach(true);
      delete this.extensionView;
    }
    this.objectPropertiesView = new ExtensionNotifierView(this.server, this.idInternal);
    this.objectPropertiesView.show(this.element);
  }

  private setObjectInternal(
      object: SDK.RemoteObject.RemoteObject, title: string|undefined,
      callback: (arg0?: (string|null)|undefined) => void): void {
    const objectPropertiesView = this.objectPropertiesView;
    // This may only happen if setPage() was called while we were evaluating the expression.
    if (!objectPropertiesView) {
      callback('operation cancelled');
      return;
    }
    objectPropertiesView.element.removeChildren();
    void UI.UIUtils.Renderer.render(object, {title, editable: false}).then(result => {
      if (!result) {
        callback();
        return;
      }
      const firstChild = result.tree && result.tree.firstChild();
      if (firstChild) {
        firstChild.expand();
      }
      objectPropertiesView.element.appendChild(result.node);
      callback();
    });
  }
}
