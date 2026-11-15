// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

import type {ExtensionServer} from './ExtensionServer.js';
import {ExtensionNotifierView, ExtensionView} from './ExtensionView.js';

const {repeat, styleMap} = Directives;
const {widget, widgetRef} = UI.Widget;

export interface ToolbarButtonData {
  id: string;
  iconURL: string;
  tooltip: string;
  disabled: boolean;
  onClick: () => void;
}

export interface ViewInput {
  server: ExtensionServer;
  id: string;
  pageURL: string;
  searchProvider: UI.SearchableView.Searchable;
  toolbarItems: ToolbarButtonData[];
}

export interface ViewOutput {
  searchableView?: UI.SearchableView.SearchableView;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <devtools-toolbar ?hidden=${input.toolbarItems.length === 0}>
      ${repeat(input.toolbarItems, item => item.id, item => html`
        <devtools-button
          class="toolbar-button toolbar-item"
          style=${styleMap({backgroundImage: item.iconURL ? `url(${item.iconURL})` : undefined})}
          title=${item.tooltip}
          ?disabled=${item.disabled}
          .data=${{
            variant: Buttons.Button.Variant.TEXT,
            reducedFocusRing: true,
            title: item.tooltip,
            disabled: item.disabled,
          } as Buttons.Button.ButtonData}
          @click=${item.onClick}
        ></devtools-button>
      `)}
    </devtools-toolbar>
    <devtools-widget class="vbox flex-auto"
      ${widget(UI.SearchableView.SearchableView, {searchProvider: input.searchProvider})}
      ${widgetRef(UI.SearchableView.SearchableView, e => {
        output.searchableView = e;
      })}>
      ${widget(ExtensionView, {
        data: {
          server: input.server,
          id: input.id,
          src: input.pageURL,
          className: 'extension',
        },
      })}
    </devtools-widget>
  `, target);
  // clang-format on
};

export class ExtensionPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable {
  readonly #server: ExtensionServer;
  readonly #id: string;
  readonly #pageURL: string;
  readonly #toolbarItems: ExtensionButton[] = [];
  readonly #view: View;
  #searchableView?: UI.SearchableView.SearchableView;

  constructor(server: ExtensionServer, panelName: string, id: string, pageURL: string, view: View = DEFAULT_VIEW) {
    super(panelName);
    this.#server = server;
    this.#id = id;
    this.#pageURL = pageURL;
    this.#view = view;
    this.setHideOnDetach();
    this.performUpdate();
  }

  override performUpdate(): void {
    const output: ViewOutput = {};
    this.#view({
      server: this.#server,
      id: this.#id,
      pageURL: this.#pageURL,
      searchProvider: this,
      toolbarItems: this.#toolbarItems.map(item => item.data()),
    },
               output, this.element);
    if (output.searchableView) {
      this.#searchableView = output.searchableView;
    }
  }

  addToolbarItem(item: ExtensionButton): void {
    item.setOnUpdate(() => this.requestUpdate());
    this.#toolbarItems.push(item);
    this.requestUpdate();
  }

  onSearchCanceled(): void {
    this.#server.notifySearchAction(this.#id, Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch);
    this.#searchableView?.updateSearchMatchesCount(0);
  }

  override searchableView(): UI.SearchableView.SearchableView|null {
    return this.#searchableView ?? null;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void {
    const query = searchConfig.query;
    this.#server.notifySearchAction(this.#id, Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PerformSearch,
                                    query);
  }

  supportsMatchCounts(): boolean {
    return false;
  }

  jumpToNextSearchResult(): void {
    this.#server.notifySearchAction(this.#id, Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult);
  }

  jumpToPreviousSearchResult(): void {
    this.#server.notifySearchAction(this.#id,
                                    Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult);
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
  readonly #id: string;
  readonly #server: ExtensionServer;
  #iconURL = '';
  #tooltip = '';
  #disabled = false;
  #onUpdate?: () => void;

  constructor(server: ExtensionServer, id: string, iconURL: string, tooltip?: string, disabled?: boolean) {
    this.#server = server;
    this.#id = id;
    this.update(iconURL, tooltip, disabled);
  }

  setOnUpdate(onUpdate: () => void): void {
    this.#onUpdate = onUpdate;
  }

  update(iconURL?: string, tooltip?: string, disabled?: boolean): void {
    if (typeof iconURL === 'string') {
      this.#iconURL = iconURL;
    }
    if (typeof tooltip === 'string') {
      this.#tooltip = tooltip;
    }
    if (typeof disabled === 'boolean') {
      this.#disabled = disabled;
    }
    this.#onUpdate?.();
  }

  data(): ToolbarButtonData {
    return {
      id: this.#id,
      iconURL: this.#iconURL,
      tooltip: this.#tooltip,
      disabled: this.#disabled,
      onClick: () => {
        this.#server.notifyButtonClicked(this.#id);
      },
    };
  }

  toolbarButton(): ExtensionButton {
    return this;
  }
}

// Generates stable hash-based id usable as (part of) viewId for any unicode string.
const hashIdentifier = (id: string): Lowercase<string> =>
    Platform.StringUtilities.hashCode(id).toString(36) as Lowercase<string>;

// Produces a stable identifier usable as (part of) viewId by either sanitizing it or hashing.
const cleanIdentifier = (id: string): Lowercase<string> =>
    Platform.StringUtilities.sanitizeIdentifier(id) || hashIdentifier(id);

export class ExtensionSidebarPane extends UI.View.SimpleView {
  readonly #panelName: string;
  private server: ExtensionServer;
  #id: string;
  private extensionView?: ExtensionView;
  private objectPropertiesView?: ExtensionNotifierView;
  constructor(server: ExtensionServer, panelName: string, title: Platform.UIString.LocalizedString, id: string,
              extensionId = 'extension') {
    const viewId =
        `extension-sidebar-${cleanIdentifier(extensionId)}-${cleanIdentifier(panelName)}-${hashIdentifier(title)}` as
        Lowercase<string>;
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

    this.extensionView = new ExtensionView();
    this.extensionView.data = {server: this.server, id: this.#id, src: url, className: 'extension fill'};
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
    this.objectPropertiesView = new ExtensionNotifierView();
    this.objectPropertiesView.data = {server: this.server, id: this.#id};
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
    objectPropertiesView.detachChildWidgets();
    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget();
    section.objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
      readOnly: true,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
    });
    section.objectTree.expanded = true;
    if (title) {
      const span = document.createElement('span');
      span.textContent = title;
      section.title = span;
    }
    section.show(objectPropertiesView.element);
    callback();
  }
}
