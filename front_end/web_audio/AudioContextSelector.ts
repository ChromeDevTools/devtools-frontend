// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text that shows there is no recording
  */
  noRecordings: '(no recordings)',
  /**
  *@description Label prefix for an audio context selection
  *@example {realtime (1e03ec)} PH1
  */
  audioContextS: 'Audio context: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('web_audio/AudioContextSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AudioContextSelector extends Common.ObjectWrapper.ObjectWrapper implements
    UI.SoftDropDown.Delegate<Protocol.WebAudio.BaseAudioContext> {
  _placeholderText: Platform.UIString.LocalizedString;
  _items: UI.ListModel.ListModel<Protocol.WebAudio.BaseAudioContext>;
  _dropDown: UI.SoftDropDown.SoftDropDown<Protocol.WebAudio.BaseAudioContext>;
  _toolbarItem: UI.Toolbar.ToolbarItem;
  _selectedContext: Protocol.WebAudio.BaseAudioContext|null;
  constructor() {
    super();

    this._placeholderText = i18nString(UIStrings.noRecordings);

    this._items = new UI.ListModel.ListModel();

    this._dropDown = new UI.SoftDropDown.SoftDropDown(this._items, this);
    this._dropDown.setPlaceholderText(this._placeholderText);

    this._toolbarItem = new UI.Toolbar.ToolbarItem(this._dropDown.element);
    this._toolbarItem.setEnabled(false);
    this._toolbarItem.setTitle(i18nString(UIStrings.audioContextS, {PH1: this._placeholderText}));
    this._items.addEventListener(UI.ListModel.Events.ItemsReplaced, this._onListItemReplaced, this);
    this._toolbarItem.element.classList.add('toolbar-has-dropdown');

    this._selectedContext = null;
  }

  _onListItemReplaced(): void {
    const hasItems = Boolean(this._items.length);
    this._toolbarItem.setEnabled(hasItems);
    if (!hasItems) {
      this._toolbarItem.setTitle(i18nString(UIStrings.audioContextS, {PH1: this._placeholderText}));
    }
  }

  contextCreated(event: Common.EventTarget.EventTargetEvent): void {
    const context = (event.data as Protocol.WebAudio.BaseAudioContext);
    this._items.insert(this._items.length, context);

    // Select if this is the first item.
    if (this._items.length === 1) {
      this._dropDown.selectItem(context);
    }
  }

  contextDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const contextId = (event.data as string);
    const contextIndex = this._items.findIndex(
        (context: Protocol.WebAudio.BaseAudioContext): boolean => context.contextId === contextId);
    if (contextIndex > -1) {
      this._items.remove(contextIndex);
    }
  }

  contextChanged(event: Common.EventTarget.EventTargetEvent): void {
    const changedContext = (event.data as Protocol.WebAudio.BaseAudioContext);
    const contextIndex = this._items.findIndex(
        (context: Protocol.WebAudio.BaseAudioContext): boolean => context.contextId === changedContext.contextId);
    if (contextIndex > -1) {
      this._items.replace(contextIndex, changedContext);

      // If the changed context is currently selected by user. Re-select it
      // because the actual element is replaced with a new one.
      if (this._selectedContext && this._selectedContext.contextId === changedContext.contextId) {
        this._dropDown.selectItem(changedContext);
      }
    }
  }

  createElementForItem(item: Protocol.WebAudio.BaseAudioContext): Element {
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element,
        {cssFile: 'web_audio/audioContextSelector.css', enableLegacyPatching: false, delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    return element;
  }

  selectedContext(): Protocol.WebAudio.BaseAudioContext|null {
    if (!this._selectedContext) {
      return null;
    }

    return this._selectedContext;
  }

  highlightedItemChanged(
      from: Protocol.WebAudio.BaseAudioContext|null, to: Protocol.WebAudio.BaseAudioContext|null,
      fromElement: Element|null, toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }
  }

  isItemSelectable(_item: Protocol.WebAudio.BaseAudioContext): boolean {
    return true;
  }

  itemSelected(item: Protocol.WebAudio.BaseAudioContext|null): void {
    if (!item) {
      return;
    }

    // It's possible that no context is selected yet.
    if (!this._selectedContext || this._selectedContext.contextId !== item.contextId) {
      this._selectedContext = item;
      this._toolbarItem.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.titleFor(item)}));
    }

    this.dispatchEventToListeners(Events.ContextSelected, item);
  }

  reset(): void {
    this._items.replaceAll([]);
  }

  titleFor(context: Protocol.WebAudio.BaseAudioContext): string {
    return `${context.contextType} (${context.contextId.substr(-6)})`;
  }

  toolbarItem(): UI.Toolbar.ToolbarItem {
    return this._toolbarItem;
  }
}

export const enum Events {
  ContextSelected = 'ContextSelected',
}
