// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualElements from '../../ui/visual_logging/visual_logging.js';
import * as ElementsComponents from './components/components.js';
import { adornerRef, ElementsTreeElement } from './ElementsTreeElement.js';
import { ElementsTreeOutline } from './ElementsTreeOutline.js';
const { html, render } = Lit;
const UIStrings = {
    /**
     * @description Link text content in Elements Tree Outline of the Elements panel
     */
    reveal: 'reveal',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ShortcutTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <div class="selection fill"></div>
    <span class="elements-tree-shortcut-title">\u21AA ${input.title}</span>
    <devtools-adorner
      .name=${ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL}
      class="adorner-reveal"
      jslog=${VisualElements.adorner('reveal')}
      aria-label=${i18nString(UIStrings.reveal)}
      @click=${input.onRevealAdornerClick}
      @mousedown=${(e) => e.consume()}
      ${adornerRef()}>
      <span class="adorner-with-icon">
        <devtools-icon name="select-element"></devtools-icon>
        <span>${ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL}</span>
      </span>
    </devtools-adorner>
  `, target);
    // clang-format on
};
export class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
    nodeShortcut;
    #hovered;
    #view;
    constructor(nodeShortcut, view = DEFAULT_VIEW) {
        super('');
        this.nodeShortcut = nodeShortcut;
        this.#view = view;
        this.performUpdate();
    }
    get hovered() {
        return Boolean(this.#hovered);
    }
    set hovered(x) {
        if (this.#hovered === x) {
            return;
        }
        this.#hovered = x;
        this.listItemElement.classList.toggle('hovered', x);
    }
    deferredNode() {
        return this.nodeShortcut.deferredNode;
    }
    domModel() {
        return this.nodeShortcut.deferredNode.domModel();
    }
    setLeftIndentOverlay() {
        // We use parent's `--indent` value and add 24px to account for an extra level of indent.
        let indent = 24;
        if (this.parent && this.parent instanceof ElementsTreeElement) {
            const parentIndent = parseFloat(this.parent.listItemElement.style.getPropertyValue('--indent')) || 0;
            indent += parentIndent;
        }
        this.listItemElement.style.setProperty('--indent', indent + 'px');
    }
    onattach() {
        this.setLeftIndentOverlay();
    }
    onselect(selectedByUser) {
        if (!selectedByUser) {
            return true;
        }
        this.nodeShortcut.deferredNode.highlight();
        this.nodeShortcut.deferredNode.resolve(resolved.bind(this));
        function resolved(node) {
            if (node && this.treeOutline instanceof ElementsTreeOutline) {
                this.treeOutline.selectedDOMNodeInternal = node;
                this.treeOutline.selectedNodeChanged(false);
            }
        }
        return true;
    }
    onRevealAdornerClick(event) {
        event.stopPropagation();
        this.nodeShortcut.deferredNode.resolve(node => {
            void Common.Revealer.reveal(node);
        });
    }
    performUpdate() {
        let text = this.nodeShortcut.nodeName.toLowerCase();
        if (this.nodeShortcut.nodeType === Node.ELEMENT_NODE) {
            text = '<' + text + '>';
        }
        this.#view({
            title: text,
            onRevealAdornerClick: this.onRevealAdornerClick.bind(this),
        }, undefined, this.listItemElement);
    }
}
//# sourceMappingURL=ShortcutTreeElement.js.map