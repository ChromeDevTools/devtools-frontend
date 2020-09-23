// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {DOMNode, Settings} from './multiple-interfaces-utils.js';

interface LayoutPaneData {
  selectedNode: DOMNode|null, settings: Settings
}
export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: Readonly<Settings>|null = null;
  private selectedDOMNode: Readonly<DOMNode>|null = null;

  set data(data: LayoutPaneData) {
    this.selectedDOMNode = data.selectedNode;
    this.settings = data.settings;
    this.update();
  }

  private update() {
    this.render();
  }

  private render() {
  }
}

customElements.define('devtools-layout-pane', LayoutPane);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-layout-pane': LayoutPane;
  }
}
