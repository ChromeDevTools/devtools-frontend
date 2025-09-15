// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

// TODO(crbug.com/442509324): remove UI dependency
// eslint-disable-next-line rulesdir/no-imports-in-directory
import '../../ui/legacy/legacy.js';

import * as Platform from '../../core/platform/platform.js';
import * as _ProtocolClient from '../../core/protocol_client/protocol_client.js';  // eslint-disable-line @typescript-eslint/no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';
// TODO(crbug.com/442509324): remove UI dependency
// eslint-disable-next-line rulesdir/no-imports-in-directory
import * as UI from '../../ui/legacy/legacy.js';

import * as ExtensionAPI from './ExtensionAPI.js';
import type {ExtensionServer} from './ExtensionServer.js';
import {ExtensionNotifierView, ExtensionView} from './ExtensionView.js';

export class ExtensionPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable {
  private readonly server: ExtensionServer;
  private readonly id: string;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  readonly #searchableView: UI.SearchableView.SearchableView;

  constructor(server: ExtensionServer, panelName: string, id: string, pageURL: string) {
    super(panelName);
    this.server = server;
    this.id = id;
    this.setHideOnDetach();
    this.panelToolbar = this.element.createChild('devtools-toolbar', 'hidden');

    this.#searchableView = new UI.SearchableView.SearchableView(this, null);
    this.#searchableView.show(this.element);

    const extensionView = new ExtensionView(server, this.id, pageURL, 'extension');
    extensionView.show(this.#searchableView.element);
  }

  addToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this.panelToolbar.classList.remove('hidden');
    this.panelToolbar.appendToolbarItem(item);
  }

  onSearchCanceled(): void {
    this.server.notifySearchAction(this.id, ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch);
    this.#searchableView.updateSearchMatchesCount(0);
  }

  override searchableView(): UI.SearchableView.SearchableView {
    return this.#searchableView;
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

  supportsWholeWordSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }
}

export class ExtensionButton {
  private readonly id: string;
  readonly #toolbarButton: UI.Toolbar.ToolbarButton;
  constructor(server: ExtensionServer, id: string, iconURL: string, tooltip?: string, disabled?: boolean) {
    this.id = id;

    this.#toolbarButton = new UI.Toolbar.ToolbarButton('', '');
    this.#toolbarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK, server.notifyButtonClicked.bind(server, this.id));
    this.update(iconURL, tooltip, disabled);
  }

  update(iconURL?: string, tooltip?: string, disabled?: boolean): void {
    if (typeof iconURL === 'string') {
      this.#toolbarButton.setBackgroundImage(iconURL);
    }
    if (typeof tooltip === 'string') {
      this.#toolbarButton.setTitle(tooltip);
    }
    if (typeof disabled === 'boolean') {
      this.#toolbarButton.setEnabled(!disabled);
    }
  }

  toolbarButton(): UI.Toolbar.ToolbarButton {
    return this.#toolbarButton;
  }
}

export class ExtensionSidebarPane extends UI.View.SimpleView {
  readonly #panelName: string;
  private server: ExtensionServer;
  #id: string;
  private extensionView?: ExtensionView;
  private objectPropertiesView?: ExtensionNotifierView;
  constructor(server: ExtensionServer, panelName: string, title: Platform.UIString.LocalizedString, id: string) {
    // For backwards compatibility we use the Kebab case version of the `title`
    // as `viewId` for sidebar panes created by extensions.
    const viewId = Platform.StringUtilities.toKebabCase(title);
    super({title, viewId});
    this.element.classList.add('fill');
    this.#panelName = panelName;
    this.server = server;
    this.#id = id;
  }

  id(): string {
    return this.#id;
  }

  panelName(): string {
    return this.#panelName;
  }

  setObject(object: Object, title: string|undefined, callback: (arg0?: (string|null)|undefined) => void): void {
    this.createObjectPropertiesView();
    this.#setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
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

    this.extensionView = new ExtensionView(this.server, this.#id, url, 'extension fill');
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
      this.#setObject(result, title, callback);
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
    this.objectPropertiesView = new ExtensionNotifierView(this.server, this.#id);
    this.objectPropertiesView.show(this.element);
  }

  #setObject(
      object: SDK.RemoteObject.RemoteObject, title: string|undefined,
      callback: (arg0?: (string|null)|undefined) => void): void {
    const objectPropertiesView = this.objectPropertiesView;
    // This may only happen if setPage() was called while we were evaluating the expression.
    if (!objectPropertiesView) {
      callback('operation cancelled');
      return;
    }
    objectPropertiesView.element.removeChildren();
    void UI.UIUtils.Renderer.render(object, {title, editable: false, expand: true}).then(result => {
      if (!result) {
        callback();
        return;
      }
      objectPropertiesView.element.appendChild(result.element);
      callback();
    });
  }
}
