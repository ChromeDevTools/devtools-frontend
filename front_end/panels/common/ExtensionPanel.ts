// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';

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

export interface SidebarPaneViewInput {
  server: ExtensionServer;
  id: string;
  pageURL?: Platform.DevToolsPath.UrlString;
  height?: string;
  showObjectProperties: boolean;
  objectTree?: ObjectUI.ObjectPropertiesSection.ObjectTree;
  objectTitle?: string;
}

export type SidebarPaneView = (
    input: SidebarPaneViewInput,
    output: undefined,
    target: HTMLElement,
    ) => void;

export const SIDEBAR_PANE_DEFAULT_VIEW: SidebarPaneView = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.pageURL ? widget(ExtensionView, {
      data: {
        server: input.server,
        id: input.id,
        src: input.pageURL,
        className: 'extension fill',
      },
    }) : input.showObjectProperties ? html`
      <devtools-widget ${widget(ExtensionNotifierView, {
        data: {
          server: input.server,
          id: input.id,
        },
      })} ${widgetRef(ExtensionNotifierView, () => {})}>
        ${input.objectTree ? html`<devtools-widget
          ${widget(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, {
            objectTree: input.objectTree,
            title: input.objectTitle ? html`<span>${input.objectTitle}</span>` : undefined,
          })}
          ${widgetRef(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, () => {})}
        ></devtools-widget>` : nothing}
      </devtools-widget>
    ` : nothing}
  `, target, {
    container: {
      classes: ['fill'],
      attributes: {
        style: input.height ? `height: ${input.height}` : undefined,
      },
    },
  });
  // clang-format on
};

export class ExtensionSidebarPane extends UI.View.SimpleView {
  readonly #panelName: string;
  readonly #server: ExtensionServer;
  readonly #id: string;
  readonly #view: SidebarPaneView;
  #pageURL?: Platform.DevToolsPath.UrlString;
  #height?: string;
  #showObjectProperties = false;
  #objectTree?: ObjectUI.ObjectPropertiesSection.ObjectTree;
  #objectTitle?: string;

  constructor(server: ExtensionServer, panelName: string, title: Platform.UIString.LocalizedString, id: string,
              extensionId = 'extension', view: SidebarPaneView = SIDEBAR_PANE_DEFAULT_VIEW) {
    const viewId =
        `extension-sidebar-${cleanIdentifier(extensionId)}-${cleanIdentifier(panelName)}-${hashIdentifier(title)}` as
        Lowercase<string>;
    super({title, viewId});
    this.#panelName = panelName;
    this.#server = server;
    this.#id = id;
    this.#view = view;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      server: this.#server,
      id: this.#id,
      pageURL: this.#pageURL,
      height: this.#height,
      showObjectProperties: this.#showObjectProperties,
      objectTree: this.#objectTree,
      objectTitle: this.#objectTitle,
    },
               undefined, this.element);
  }

  id(): string {
    return this.#id;
  }

  panelName(): string {
    return this.#panelName;
  }

  setObject(object: Object, title: string|undefined, callback: (arg0?: (string|null)|undefined) => void): void {
    this.#pageURL = undefined;
    this.#showObjectProperties = true;
    this.#setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
  }

  setExpression(
      expression: string, title: string|undefined, evaluateOptions: Object|undefined, securityOrigin: string,
      callback: (arg0?: (string|null)|undefined) => void): void {
    this.#createObjectPropertiesView();
    this.#server.evaluate(expression, true, false, evaluateOptions, securityOrigin,
                          this.#onEvaluate.bind(this, title, callback));
  }

  setPage(url: Platform.DevToolsPath.UrlString): void {
    this.#showObjectProperties = false;
    this.#objectTree = undefined;
    this.#objectTitle = undefined;
    this.#pageURL = url;
    if (!this.#height) {
      this.#height = '150px';
    }
    this.requestUpdate();
  }

  setHeight(height: string): void {
    if (this.#height === height) {
      return;
    }
    this.#height = height;
    this.requestUpdate();
  }

  #onEvaluate(title: string|undefined, callback: (arg0?: (string|null)|undefined) => void, error: string|null,
              result: SDK.RemoteObject.RemoteObject|null, _wasThrown?: boolean): void {
    if (error) {
      callback(error.toString());
    } else if (!result) {
      callback();
    } else {
      this.#setObject(result, title, callback);
    }
  }

  #createObjectPropertiesView(): void {
    if (this.#showObjectProperties) {
      return;
    }
    this.#pageURL = undefined;
    this.#objectTree = undefined;
    this.#objectTitle = undefined;
    this.#showObjectProperties = true;
    this.requestUpdate();
  }

  #setObject(
      object: SDK.RemoteObject.RemoteObject, title: string|undefined,
      callback: (arg0?: (string|null)|undefined) => void): void {
    // This may only happen if setPage() was called while we were evaluating the expression.
    if (!this.#showObjectProperties) {
      callback('operation cancelled');
      return;
    }
    const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
      readOnly: true,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
    });
    objectTree.expanded = true;
    this.#objectTree = objectTree;
    this.#objectTitle = title;
    this.requestUpdate();
    void this.updateComplete.then(() => UI.Widget.Widget.allUpdatesComplete).then(() => {
      callback();
    });
  }
}
