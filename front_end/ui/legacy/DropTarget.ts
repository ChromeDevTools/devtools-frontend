// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';

export class DropTarget {
  _element: Element;
  _transferTypes: {
    kind: string,
    type: RegExp,
  }[];
  _messageText: string;
  _handleDrop: (arg0: DataTransfer) => void;
  _enabled: boolean;
  _dragMaskElement: Element|null;

  constructor(
      element: Element, transferTypes: {
        kind: string,
        type: RegExp,
      }[],
      messageText: string, handleDrop: (arg0: DataTransfer) => void) {
    element.addEventListener('dragenter', this._onDragEnter.bind(this), true);
    element.addEventListener('dragover', this._onDragOver.bind(this), true);
    this._element = element;
    this._transferTypes = transferTypes;
    this._messageText = messageText;
    this._handleDrop = handleDrop;
    this._enabled = true;
    this._dragMaskElement = null;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  _onDragEnter(event: Event): void {
    if (this._enabled && this._hasMatchingType(event)) {
      event.consume(true);
    }
  }

  _hasMatchingType(ev: Event): boolean {
    const event = (ev as DragEvent);
    if (!event.dataTransfer) {
      return false;
    }
    for (const transferType of this._transferTypes) {
      const found = Array.from(event.dataTransfer.items).find(item => {
        return transferType.kind === item.kind && Boolean(transferType.type.exec(item.type));
      });
      if (found) {
        return true;
      }
    }
    return false;
  }

  _onDragOver(ev: Event): void {
    const event = (ev as DragEvent);
    if (!this._enabled || !this._hasMatchingType(event)) {
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    event.consume(true);
    if (this._dragMaskElement) {
      return;
    }
    this._dragMaskElement = this._element.createChild('div', '');
    const shadowRoot = createShadowRootWithCoreStyles(
        this._dragMaskElement,
        {cssFile: 'ui/legacy/dropTarget.css', enableLegacyPatching: false, delegatesFocus: undefined});
    shadowRoot.createChild('div', 'drop-target-message').textContent = this._messageText;
    this._dragMaskElement.addEventListener('drop', this._onDrop.bind(this), true);
    this._dragMaskElement.addEventListener('dragleave', this._onDragLeave.bind(this), true);
  }

  _onDrop(ev: Event): void {
    const event = (ev as DragEvent);
    event.consume(true);
    this._removeMask();
    if (this._enabled && event.dataTransfer) {
      this._handleDrop(event.dataTransfer);
    }
  }

  _onDragLeave(event: Event): void {
    event.consume(true);
    this._removeMask();
  }

  _removeMask(): void {
    if (this._dragMaskElement) {
      this._dragMaskElement.remove();
      this._dragMaskElement = null;
    }
  }
}

export const Type = {
  URI: {kind: 'string', type: /text\/uri-list/},
  Folder: {kind: 'file', type: /$^/},
  File: {kind: 'file', type: /.*/},
  WebFile: {kind: 'file', type: /[\w]+/},
  ImageFile: {kind: 'file', type: /image\/.*/},
};
