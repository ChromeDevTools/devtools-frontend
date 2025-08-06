// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';

const UIStrings = {
  /**
   * @description Text to refresh the page
   */
  refresh: 'Refresh',
  /**
   * @description Text to clear everything
   */
  clearAll: 'Clear All',
  /**
   * @description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: 'Delete Selected',
  /**
   * @description Text that informs screen reader users that the storage table has been refreshed
   */
  refreshedStatus: 'Table refreshed',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/StorageItemsToolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {html, render} = Lit;

interface ViewInput {
  onRefresh: () => void;
  onDeleteAll: () => void;
  onDeleteSelected: () => void;
  metadataView: ApplicationComponents.StorageMetadataView.StorageMetadataView;
  onFilterChanged: (ev: CustomEvent<string|null>) => void;
  deleteAllButtonEnabled: boolean;
  deleteSelectedButtonDisabled: boolean;
  filterItemEnabled: boolean;
  deleteAllButtonIconName: string;
  deleteAllButtonTitle: string;
  mainToolbarItems: UI.Toolbar.ToolbarItem[];
}

export const DEFAULT_VIEW = (input: ViewInput, _output: object, target: HTMLElement): void => {
  render(
      // clang-format off
      html`
      <devtools-toolbar class="top-resources-toolbar"
                        jslog=${VisualLogging.toolbar()}>
        <devtools-button title=${i18nString(UIStrings.refresh)}
                         jslog=${VisualLogging.action('storage-items-view.refresh').track({
        click: true
      })}
                         @click=${input.onRefresh}
                         .iconName=${'refresh'}
                         .variant=${Buttons.Button.Variant.TOOLBAR}></devtools-button>
        <devtools-toolbar-input type="filter"
                                ?disabled=${!input.filterItemEnabled}
                                @change=${input.onFilterChanged}
                                style="flex-grow:0.4"></devtools-toolbar-input>
        ${new UI.Toolbar.ToolbarSeparator().element}
        <devtools-button title=${input.deleteAllButtonTitle}
                         @click=${input.onDeleteAll}
                         id=storage-items-delete-all
                         ?disabled=${!input.deleteAllButtonEnabled}
                         jslog=${VisualLogging.action('storage-items-view.clear-all').track({
        click: true
      })}
                         .iconName=${input.deleteAllButtonIconName}
                         .variant=${Buttons.Button.Variant.TOOLBAR}></devtools-button>
        <devtools-button title=${i18nString(UIStrings.deleteSelected)}
                         @click=${input.onDeleteSelected}
                         ?disabled=${!input.deleteSelectedButtonDisabled}
                         jslog=${VisualLogging.action('storage-items-view.delete-selected').track({
        click: true
      })}
                         .iconName=${'cross'}
                         .variant=${Buttons.Button.Variant.TOOLBAR}></devtools-button>
        ${input.mainToolbarItems.map(item => item.element)}
      </devtools-toolbar>
      ${input.metadataView}`,
      // clang-format on
      target);
};

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export class StorageItemsToolbar extends
    Common.ObjectWrapper.eventMixin<StorageItemsToolbar.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  filterRegex: RegExp|null;
  #metadataView: ApplicationComponents.StorageMetadataView.StorageMetadataView|undefined;
  readonly #view: View;
  #deleteAllButtonEnabled = true;
  #deleteSelectedButtonDisabled = true;
  #filterItemEnabled = true;
  #deleteAllButtonIconName = 'clear';
  #deleteAllButtonTitle: string = i18nString(UIStrings.clearAll);
  #mainToolbarItems: UI.Toolbar.ToolbarItem[] = [];

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.filterRegex = null;
  }

  set metadataView(view: ApplicationComponents.StorageMetadataView.StorageMetadataView) {
    this.#metadataView = view;
  }

  get metadataView(): ApplicationComponents.StorageMetadataView.StorageMetadataView {
    if (!this.#metadataView) {
      this.#metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
    }
    return this.#metadataView;
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      deleteAllButtonEnabled: this.#deleteAllButtonEnabled,
      deleteSelectedButtonDisabled: this.#deleteSelectedButtonDisabled,
      filterItemEnabled: this.#filterItemEnabled,
      deleteAllButtonIconName: this.#deleteAllButtonIconName,
      deleteAllButtonTitle: this.#deleteAllButtonTitle,
      mainToolbarItems: this.#mainToolbarItems,
      metadataView: this.metadataView,
      onFilterChanged: this.filterChanged.bind(this),
      onRefresh: () => {
        this.dispatchEventToListeners(StorageItemsToolbar.Events.REFRESH);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.refreshedStatus));
      },
      onDeleteAll: () => this.dispatchEventToListeners(StorageItemsToolbar.Events.DELETE_ALL),
      onDeleteSelected: () => this.dispatchEventToListeners(StorageItemsToolbar.Events.DELETE_SELECTED),
    };
    this.#view(viewInput, {}, this.contentElement);
  }

  setDeleteAllTitle(title: string): void {
    this.#deleteAllButtonTitle = title;
    this.requestUpdate();
  }

  setDeleteAllGlyph(glyph: string): void {
    this.#deleteAllButtonIconName = glyph;
    this.requestUpdate();
  }

  appendToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this.#mainToolbarItems.push(item);
    this.requestUpdate();
  }

  setStorageKey(storageKey: string): void {
    this.metadataView.setStorageKey(storageKey);
  }

  filterChanged({detail: text}: CustomEvent<string|null>): void {
    this.filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
    this.dispatchEventToListeners(StorageItemsToolbar.Events.REFRESH);
  }

  hasFilter(): boolean {
    return Boolean(this.filterRegex);
  }

  setCanDeleteAll(enabled: boolean): void {
    this.#deleteAllButtonEnabled = enabled;
    this.requestUpdate();
  }

  setCanDeleteSelected(enabled: boolean): void {
    this.#deleteSelectedButtonDisabled = enabled;
    this.requestUpdate();
  }

  setCanFilter(enabled: boolean): void {
    this.#filterItemEnabled = enabled;
    this.requestUpdate();
  }
}

export namespace StorageItemsToolbar {
  export const enum Events {
    REFRESH = 'Refresh',
    FILTER_CHANGED = 'FilterChanged',
    DELETE_ALL = 'DeleteAll',
    DELETE_SELECTED = 'DeleteSelected',
  }

  export interface EventTypes {
    [Events.REFRESH]: void;
    [Events.FILTER_CHANGED]: void;
    [Events.DELETE_ALL]: void;
    [Events.DELETE_SELECTED]: void;
  }
}
