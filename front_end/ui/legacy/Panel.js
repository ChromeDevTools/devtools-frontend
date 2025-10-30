// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { SplitWidget } from './SplitWidget.js';
import { VBox } from './Widget.js';
export class Panel extends VBox {
    panelName;
    constructor(name, useShadowDom) {
        super({ useShadowDom });
        this.element.setAttribute('jslog', `${VisualLogging.panel().context(name).track({ resize: true })}`);
        this.element.classList.add('panel');
        this.element.setAttribute('aria-label', name);
        this.element.classList.add(name);
        this.panelName = name;
        // @ts-expect-error: Legacy global. Requires rewriting tests to get rid of.
        // For testing.
        self.UI = self.UI || {};
        // @ts-expect-error
        self.UI.panels = self.UI.panels || {};
        // @ts-expect-error
        UI.panels[name] = this;
    }
    get name() {
        return this.panelName;
    }
    searchableView() {
        return null;
    }
    elementsToRestoreScrollPositionsFor() {
        return [];
    }
}
export class PanelWithSidebar extends Panel {
    panelSplitWidget;
    mainWidget;
    sidebarWidget;
    constructor(name, defaultWidth) {
        super(name);
        this.panelSplitWidget =
            new SplitWidget(true, false, this.panelName + '-panel-split-view-state', defaultWidth || 200);
        this.panelSplitWidget.show(this.element);
        this.mainWidget = new VBox();
        this.panelSplitWidget.setMainWidget(this.mainWidget);
        this.sidebarWidget = new VBox();
        this.sidebarWidget.setMinimumSize(100, 25);
        this.panelSplitWidget.setSidebarWidget(this.sidebarWidget);
        this.sidebarWidget.element.classList.add('panel-sidebar');
        this.sidebarWidget.element.setAttribute('jslog', `${VisualLogging.pane('sidebar').track({ resize: true })}`);
    }
    panelSidebarElement() {
        return this.sidebarWidget.element;
    }
    mainElement() {
        return this.mainWidget.element;
    }
    splitWidget() {
        return this.panelSplitWidget;
    }
}
//# sourceMappingURL=Panel.js.map