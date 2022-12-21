// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';

import audioContextSelectorStyles from './audioContextSelector.css.js';

import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/AudioContextSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AudioContextSelector extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    UI.SoftDropDown.Delegate<Protocol.WebAudio.BaseAudioContext> {
  private readonly placeholderText: Platform.UIString.LocalizedString;
  private readonly items: UI.ListModel.ListModel<Protocol.WebAudio.BaseAudioContext>;
  private readonly dropDown: UI.SoftDropDown.SoftDropDown<Protocol.WebAudio.BaseAudioContext>;
  private readonly toolbarItemInternal: UI.Toolbar.ToolbarItem;
  private selectedContextInternal: Protocol.WebAudio.BaseAudioContext|null;
  constructor() {
    super();

    this.placeholderText = i18nString(UIStrings.noRecordings);

    this.items = new UI.ListModel.ListModel();

    this.dropDown = new UI.SoftDropDown.SoftDropDown(this.items, this);
    this.dropDown.setPlaceholderText(this.placeholderText);

    this.toolbarItemInternal = new UI.Toolbar.ToolbarItem(this.dropDown.element);
    this.toolbarItemInternal.setEnabled(false);
    this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.placeholderText}));
    this.items.addEventListener(UI.ListModel.Events.ItemsReplaced, this.onListItemReplaced, this);
    this.toolbarItemInternal.element.classList.add('toolbar-has-dropdown');

    this.selectedContextInternal = null;
  }

  private onListItemReplaced(): void {
    const hasItems = Boolean(this.items.length);
    this.toolbarItemInternal.setEnabled(hasItems);
    if (!hasItems) {
      this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.placeholderText}));
    }
  }

  contextCreated({data: context}: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    this.items.insert(this.items.length, context);

    // Select if this is the first item.
    if (this.items.length === 1) {
      this.dropDown.selectItem(context);
    }
  }

  contextDestroyed({data: contextId}: Common.EventTarget.EventTargetEvent<string>): void {
    const contextIndex =
        this.items.findIndex((context: Protocol.WebAudio.BaseAudioContext): boolean => context.contextId === contextId);
    if (contextIndex > -1) {
      this.items.remove(contextIndex);
    }
  }

  contextChanged({data: changedContext}: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>):
      void {
    const contextIndex = this.items.findIndex(
        (context: Protocol.WebAudio.BaseAudioContext): boolean => context.contextId === changedContext.contextId);
    if (contextIndex > -1) {
      this.items.replace(contextIndex, changedContext);

      // If the changed context is currently selected by user. Re-select it
      // because the actual element is replaced with a new one.
      if (this.selectedContextInternal && this.selectedContextInternal.contextId === changedContext.contextId) {
        this.dropDown.selectItem(changedContext);
      }
    }
  }

  createElementForItem(item: Protocol.WebAudio.BaseAudioContext): Element {
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element, {cssFile: [audioContextSelectorStyles], delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    return element;
  }

  selectedContext(): Protocol.WebAudio.BaseAudioContext|null {
    if (!this.selectedContextInternal) {
      return null;
    }

    return this.selectedContextInternal;
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
    if (!this.selectedContextInternal || this.selectedContextInternal.contextId !== item.contextId) {
      this.selectedContextInternal = item;
      this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.titleFor(item)}));
    }

    this.dispatchEventToListeners(Events.ContextSelected, item);
  }

  reset(): void {
    this.items.replaceAll([]);
  }

  titleFor(context: Protocol.WebAudio.BaseAudioContext): string {
    return `${context.contextType} (${context.contextId.substr(-6)})`;
  }

  toolbarItem(): UI.Toolbar.ToolbarItem {
    return this.toolbarItemInternal;
  }
}

export const enum Events {
  ContextSelected = 'ContextSelected',
}

export type EventTypes = {
  [Events.ContextSelected]: Protocol.WebAudio.BaseAudioContext|null,
};
