// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import {type SearchableView} from './SearchableView.js';
import {SplitWidget} from './SplitWidget.js';
import {VBox} from './Widget.js';

export class Panel extends VBox {
  protected panelName: string;

  constructor(name: string) {
    super();

    this.element.classList.add('panel');
    this.element.setAttribute('aria-label', name);
    this.element.classList.add(name);
    this.panelName = name;

    // @ts-ignore: Legacy global. Requires rewriting tests to get rid of.
    // For testing.
    self.UI = self.UI || {};
    // @ts-ignore
    self.UI.panels = self.UI.panels || {};
    // @ts-ignore
    UI.panels[name] = this;
  }

  get name(): string {
    return this.panelName;
  }

  searchableView(): SearchableView|null {
    return null;
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    return [];
  }
}

export class PanelWithSidebar extends Panel {
  private readonly panelSplitWidget: SplitWidget;
  private readonly mainWidget: VBox;
  private readonly sidebarWidget: VBox;

  constructor(name: string, defaultWidth?: number) {
    super(name);

    this.panelSplitWidget = new SplitWidget(true, false, this.panelName + 'PanelSplitViewState', defaultWidth || 200);
    this.panelSplitWidget.show(this.element);

    this.mainWidget = new VBox();
    this.panelSplitWidget.setMainWidget(this.mainWidget);

    this.sidebarWidget = new VBox();
    this.sidebarWidget.setMinimumSize(100, 25);
    this.panelSplitWidget.setSidebarWidget(this.sidebarWidget);

    this.sidebarWidget.element.classList.add('panel-sidebar');
  }

  panelSidebarElement(): Element {
    return this.sidebarWidget.element;
  }

  mainElement(): Element {
    return this.mainWidget.element;
  }

  splitWidget(): SplitWidget {
    return this.panelSplitWidget;
  }
}
