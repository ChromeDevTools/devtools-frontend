// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ShortcutTreeElement } from './ShortcutTreeElement.js';
export class TopLayerContainer extends UI.TreeOutline.TreeElement {
    tree;
    document;
    constructor(tree, document) {
        super('#top-layer');
        this.tree = tree;
        this.document = document;
        this.document.domModel().addEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
        this.topLayerElementsChanged({
            data: {
                document,
                documentShortcuts: [],
            },
        });
    }
    topLayerElementsChanged(event) {
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
    revealInTopLayer(node) {
        this.children().forEach(child => {
            if (child instanceof ShortcutTreeElement && child.deferredNode().backendNodeId() === node.backendNodeId()) {
                child.revealAndSelect();
            }
        });
    }
}
//# sourceMappingURL=TopLayerContainer.js.map