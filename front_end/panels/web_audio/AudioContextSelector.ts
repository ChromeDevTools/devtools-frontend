// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/AudioContextSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AudioContextSelector extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly placeholderText: Platform.UIString.LocalizedString;
  private readonly selectElement: HTMLSelectElement;
  private readonly items: UI.ListModel.ListModel<Protocol.WebAudio.BaseAudioContext>;
  private readonly toolbarItemInternal: UI.Toolbar.ToolbarItem;

  constructor() {
    super();

    this.placeholderText = i18nString(UIStrings.noRecordings);
    this.items = new UI.ListModel.ListModel();
    this.selectElement = document.createElement('select');
    this.toolbarItemInternal = new UI.Toolbar.ToolbarItem(this.selectElement);
    this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.placeholderText}));
    this.selectElement.addEventListener('change', this.onSelectionChanged.bind(this));
    this.selectElement.disabled = true;
    this.addPlaceholderOption();

    this.items.addEventListener(UI.ListModel.Events.ITEMS_REPLACED, this.onListItemReplaced, this);
  }

  private addPlaceholderOption(): void {
    const placeholderOption = UI.Fragment.html`
    <option value="" hidden>${this.placeholderText}</option>`;
    this.selectElement.appendChild(placeholderOption);
  }

  private onListItemReplaced(): void {
    this.selectElement.removeChildren();

    if (this.items.length === 0) {
      this.addPlaceholderOption();
      this.selectElement.disabled = true;
      this.onSelectionChanged();
      return;
    }

    for (const context of this.items) {
      const option = UI.Fragment.html`
    <option value=${context.contextId}>${this.titleFor(context)}</option>`;
      this.selectElement.appendChild(option);
    }
    this.selectElement.disabled = false;
    this.onSelectionChanged();
  }

  contextCreated({data: context}: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    this.items.insert(this.items.length, context);
    this.onListItemReplaced();
  }

  contextDestroyed({data: contextId}: Common.EventTarget.EventTargetEvent<string>): void {
    const index = this.items.findIndex(context => context.contextId === contextId);
    if (index !== -1) {
      this.items.remove(index);
      this.onListItemReplaced();
    }
  }

  contextChanged({data: changedContext}: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>):
      void {
    const index = this.items.findIndex(context => context.contextId === changedContext.contextId);
    if (index !== -1) {
      this.items.replace(index, changedContext);
      this.onListItemReplaced();
    }
  }

  selectedContext(): Protocol.WebAudio.BaseAudioContext|null {
    const selectedValue = this.selectElement.value;
    if (!selectedValue) {
      return null;
    }
    return this.items.find(context => context.contextId === selectedValue) || null;
  }

  onSelectionChanged(): void {
    const selectedContext = this.selectedContext();
    if (selectedContext) {
      this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.titleFor(selectedContext)}));
    } else {
      this.toolbarItemInternal.setTitle(i18nString(UIStrings.audioContextS, {PH1: this.placeholderText}));
    }
    this.dispatchEventToListeners(Events.CONTEXT_SELECTED, selectedContext);
  }

  itemSelected(item: Protocol.WebAudio.BaseAudioContext|null): void {
    if (!item) {
      return;
    }
    this.selectElement.value = item.contextId;
    this.onSelectionChanged();
  }

  reset(): void {
    this.items.replaceAll([]);
    this.onListItemReplaced();
  }

  titleFor(context: Protocol.WebAudio.BaseAudioContext): string {
    return `${context.contextType} (${context.contextId.substr(-6)})`;
  }

  toolbarItem(): UI.Toolbar.ToolbarItem {
    return this.toolbarItemInternal;
  }
}

export const enum Events {
  CONTEXT_SELECTED = 'ContextSelected',
}

export interface EventTypes {
  [Events.CONTEXT_SELECTED]: Protocol.WebAudio.BaseAudioContext|null;
}
