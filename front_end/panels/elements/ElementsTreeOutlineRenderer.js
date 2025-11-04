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
import * as SDK from '../../core/sdk/sdk.js';
import { ElementsTreeOutline } from './ElementsTreeOutline.js';
let rendererInstance;
export class Renderer {
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!rendererInstance || forceNew) {
            rendererInstance = new Renderer();
        }
        return rendererInstance;
    }
    async render(object, options) {
        let node = null;
        if (object instanceof SDK.DOMModel.DOMNode) {
            node = (object);
        }
        else if (object instanceof SDK.DOMModel.DeferredDOMNode) {
            node = await (object).resolvePromise();
        }
        if (!node) {
            // Can't render not-a-node, or couldn't resolve deferred node.
            return null;
        }
        const treeOutline = new ElementsTreeOutline(
        /* omitRootDOMNode: */ false, /* selectEnabled: */ true, /* hideGutter: */ true);
        treeOutline.rootDOMNode = node;
        treeOutline.deindentSingleNode();
        treeOutline.setVisible(true);
        // @ts-expect-error used in console_test_runner
        treeOutline.element.treeElementForTest = treeOutline.firstChild();
        treeOutline.setShowSelectionOnKeyboardFocus(/* show: */ true, /* preventTabOrder: */ true);
        if (options?.expand) {
            treeOutline.firstChild()?.expand();
        }
        return {
            element: treeOutline.element,
            forceSelect: treeOutline.forceSelect.bind(treeOutline),
        };
    }
}
//# sourceMappingURL=ElementsTreeOutlineRenderer.js.map