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

/* eslint-disable rulesdir/no_underscored_properties */

import * as _ProtocolClient from '../../core/protocol_client/protocol_client.js';  // eslint-disable-line @typescript-eslint/no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {ExtensionServer} from './ExtensionServer.js'; // eslint-disable-line no-unused-vars
import {ExtensionNotifierView, ExtensionView} from './ExtensionView.js';

export class ExtensionPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable {
  _server: ExtensionServer;
  _id: string;
  _panelToolbar: UI.Toolbar.Toolbar;
  _searchableView: UI.SearchableView.SearchableView;

  constructor(server: ExtensionServer, panelName: string, id: string, pageURL: string) {
    super(panelName);
    this._server = server;
    this._id = id;
    this.setHideOnDetach();
    this._panelToolbar = new UI.Toolbar.Toolbar('hidden', this.element);

    this._searchableView = new UI.SearchableView.SearchableView(this, null);
    this._searchableView.show(this.element);

    const extensionView = new ExtensionView(server, this._id, pageURL, 'extension');
    extensionView.show(this._searchableView.element);
  }

  addToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this._panelToolbar.element.classList.remove('hidden');
    this._panelToolbar.appendToolbarItem(item);
  }

  searchCanceled(): void {
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._server.notifySearchAction(this._id, Extensions.extensionAPI.panels.SearchAction.CancelSearch);
    this._searchableView.updateSearchMatchesCount(0);
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this._searchableView;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void {
    const query = searchConfig.query;
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._server.notifySearchAction(this._id, Extensions.extensionAPI.panels.SearchAction.PerformSearch, query);
  }

  jumpToNextSearchResult(): void {
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._server.notifySearchAction(this._id, Extensions.extensionAPI.panels.SearchAction.NextSearchResult);
  }

  jumpToPreviousSearchResult(): void {
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._server.notifySearchAction(this._id, Extensions.extensionAPI.panels.SearchAction.PreviousSearchResult);
  }

  supportsCaseSensitiveSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }
}

export class ExtensionButton {
  _id: string;
  _toolbarButton: UI.Toolbar.ToolbarButton;
  constructor(server: ExtensionServer, id: string, iconURL: string, tooltip?: string, disabled?: boolean) {
    this._id = id;

    this._toolbarButton = new UI.Toolbar.ToolbarButton('', '');
    this._toolbarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, server.notifyButtonClicked.bind(server, this._id));
    this.update(iconURL, tooltip, disabled);
  }

  update(iconURL: string, tooltip?: string, disabled?: boolean): void {
    if (typeof iconURL === 'string') {
      this._toolbarButton.setBackgroundImage(iconURL);
    }
    if (typeof tooltip === 'string') {
      this._toolbarButton.setTitle(tooltip);
    }
    if (typeof disabled === 'boolean') {
      this._toolbarButton.setEnabled(!disabled);
    }
  }

  toolbarButton(): UI.Toolbar.ToolbarButton {
    return this._toolbarButton;
  }
}

export class ExtensionSidebarPane extends UI.View.SimpleView {
  _panelName: string;
  _server: ExtensionServer;
  _id: string;
  _extensionView?: ExtensionView;
  _objectPropertiesView?: ExtensionNotifierView;
  constructor(server: ExtensionServer, panelName: string, title: string, id: string) {
    super(title);
    this.element.classList.add('fill');
    this._panelName = panelName;
    this._server = server;
    this._id = id;
  }

  id(): string {
    return this._id;
  }

  panelName(): string {
    return this._panelName;
  }

  setObject(object: Object, title: string, callback: (arg0?: (string|null)|undefined) => void): void {
    this._createObjectPropertiesView();
    this._setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
  }

  setExpression(
      expression: string, title: string, evaluateOptions: Object, securityOrigin: string,
      callback: (arg0?: (string|null)|undefined) => void): void {
    this._createObjectPropertiesView();
    this._server.evaluate(
        expression, true, false, evaluateOptions, securityOrigin, this._onEvaluate.bind(this, title, callback));
  }

  setPage(url: string): void {
    if (this._objectPropertiesView) {
      this._objectPropertiesView.detach();
      delete this._objectPropertiesView;
    }
    if (this._extensionView) {
      this._extensionView.detach(true);
    }

    this._extensionView = new ExtensionView(this._server, this._id, url, 'extension fill');
    this._extensionView.show(this.element);

    if (!this.element.style.height) {
      this.setHeight('150px');
    }
  }

  setHeight(height: string): void {
    this.element.style.height = height;
  }

  _onEvaluate(
      title: string, callback: (arg0?: (string|null)|undefined) => void, error: string|null,
      result: SDK.RemoteObject.RemoteObject|null, _wasThrown?: boolean): void {
    if (error) {
      callback(error.toString());
    } else if (!result) {
      callback();
    } else {
      this._setObject(result, title, callback);
    }
  }

  _createObjectPropertiesView(): void {
    if (this._objectPropertiesView) {
      return;
    }
    if (this._extensionView) {
      this._extensionView.detach(true);
      delete this._extensionView;
    }
    this._objectPropertiesView = new ExtensionNotifierView(this._server, this._id);
    this._objectPropertiesView.show(this.element);
  }

  _setObject(object: SDK.RemoteObject.RemoteObject, title: string, callback: (arg0?: (string|null)|undefined) => void):
      void {
    const objectPropertiesView = this._objectPropertiesView;
    // This may only happen if setPage() was called while we were evaluating the expression.
    if (!objectPropertiesView) {
      callback('operation cancelled');
      return;
    }
    objectPropertiesView.element.removeChildren();
    UI.UIUtils.Renderer.render(object, {title, editable: false}).then(result => {
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
