// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {ElementsTreeOutline} from './ElementsTreeOutline.js';
import {ShortcutTreeElement} from './ShortcutTreeElement.js';

export class TopLayerContainer extends UI.TreeOutline.TreeElement {
  tree: ElementsTreeOutline;
  document: SDK.DOMModel.DOMDocument;

  constructor(tree: ElementsTreeOutline, document: SDK.DOMModel.DOMDocument) {
    super('#top-layer');
    this.tree = tree;
    this.document = document;
    this.document.domModel().addEventListener(
        SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
    this.topLayerElementsChanged({
      data: {
        document,
        documentShortcuts: [],
      },
    });
  }

  topLayerElementsChanged(
      event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.EventTypes['TopLayerElementsChanged']>): void {
    if (this.document !== event.data.document) {
      return;
    }
    this.removeChildren();
    const shortcuts = event.data.documentShortcuts;
    this.hidden = shortcuts.length === 0;
    for (const shortcut of shortcuts) {
      const element = new ShortcutTreeElement(shortcut);
      this.appendChild(element);
      for (const child of shortcut.childShortcuts) {
        element.appendChild(new ShortcutTreeElement(child));
      }
    }
  }

  revealInTopLayer(node: SDK.DOMModel.DOMNode): void {
    this.children().forEach(child => {
      if (child instanceof ShortcutTreeElement && child.deferredNode().backendNodeId() === node.backendNodeId()) {
        child.revealAndSelect();
      }
    });
  }
}
