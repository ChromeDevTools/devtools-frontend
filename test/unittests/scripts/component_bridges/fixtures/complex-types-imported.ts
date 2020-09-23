// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {BooleanSetting, DOMNode, EnumSetting, Setting} from './complex-types-utils.js';

export class SettingChangedEvent extends Event {
  data: {setting: string, value: string|boolean};

  constructor(setting: string, value: string|boolean) {
    super('setting-changed', {});
    this.data = {setting, value};
  }
}

interface LayoutPaneData {
  selectedNode: DOMNode|null, settings: Setting[],
}

export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: Readonly<Setting[]>|null = null;
  private selectedDOMNode: Readonly<DOMNode>|null = null;
  private collapsed = false;

  set data(data: LayoutPaneData) {
    this.selectedDOMNode = data.selectedNode;
    this.settings = data.settings;
    this.update();
  }

  private update() {
    this.render();
  }

  private toggleGridSection() {
    return () => {
      this.collapsed = !this.collapsed;
      this.update();
    };
  }

  private render() {
  }

  private onBooleanSettingChange(setting: BooleanSetting) {
    return (event: Event&{target: HTMLInputElement}) => {
      event.preventDefault();
      this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.checked));
    };
  }

  private onEnumSettingChange(setting: EnumSetting) {
    return (event: Event&{target: HTMLInputElement}) => {
      event.preventDefault();
      this.dispatchEvent(new SettingChangedEvent(setting.name, event.target.value));
    };
  }

  private renderBooleanSetting(setting: BooleanSetting) {
  }

  private renderEnumSetting(setting: EnumSetting) {
  }
}

customElements.define('devtools-layout-pane', LayoutPane);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-layout-pane': LayoutPane;
  }
}
