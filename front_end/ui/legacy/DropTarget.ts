// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import dropTargetStyles from './dropTarget.css.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';

export class DropTarget {
  private element: HTMLElement;
  private readonly transferTypes: Array<{
    kind: string,
    type: RegExp,
  }>;
  private messageText: string;
  private readonly handleDrop: (arg0: DataTransfer) => void;
  private enabled: boolean;
  private dragMaskElement: HTMLElement|null;

  constructor(
      element: HTMLElement, transferTypes: Array<{
        kind: string,
        type: RegExp,
      }>,
      messageText: string, handleDrop: (arg0: DataTransfer) => void) {
    element.addEventListener('dragenter', this.onDragEnter.bind(this), true);
    element.addEventListener('dragover', this.onDragOver.bind(this), true);
    this.element = element;
    this.transferTypes = transferTypes;
    this.messageText = messageText;
    this.handleDrop = handleDrop;
    this.enabled = true;
    this.dragMaskElement = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private onDragEnter(event: DragEvent): void {
    if (this.enabled && this.hasMatchingType(event)) {
      event.consume(true);
    }
  }

  private hasMatchingType(event: DragEvent): boolean {
    if (!event.dataTransfer) {
      return false;
    }
    for (const transferType of this.transferTypes) {
      const found = Array.from(event.dataTransfer.items).find(item => {
        return transferType.kind === item.kind && Boolean(transferType.type.exec(item.type));
      });
      if (found) {
        return true;
      }
    }
    return false;
  }

  private onDragOver(event: DragEvent): void {
    if (!this.enabled || !this.hasMatchingType(event)) {
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    event.consume(true);
    if (this.dragMaskElement) {
      return;
    }
    this.dragMaskElement = this.element.createChild('div', '');
    const shadowRoot = createShadowRootWithCoreStyles(this.dragMaskElement, {cssFile: dropTargetStyles});
    shadowRoot.createChild('div', 'drop-target-message').textContent = this.messageText;
    this.dragMaskElement.addEventListener('drop', this.onDrop.bind(this), true);
    this.dragMaskElement.addEventListener('dragleave', this.onDragLeave.bind(this), true);
  }

  private onDrop(event: DragEvent): void {
    event.consume(true);
    this.removeMask();
    if (this.enabled && event.dataTransfer) {
      this.handleDrop(event.dataTransfer);
    }
  }

  private onDragLeave(event: Event): void {
    event.consume(true);
    this.removeMask();
  }

  private removeMask(): void {
    if (this.dragMaskElement) {
      this.dragMaskElement.remove();
      this.dragMaskElement = null;
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
