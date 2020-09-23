// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export interface DOMNode {
  smth: string;
}

export const enum SettingType {
  a = 'a',
  b = 'b'
}

export interface BaseSettingOption {
  label: string;
}

export interface BooleanSettingOption {
  value: boolean;
}

export interface EnumSettingOption {
  value: string;
}

export interface BaseSetting {
  settingName: string;
  settingType: SettingType;
}

interface LayoutPaneData {
  input: Setting[]
}

export type BooleanSetting = BaseSetting&{options: BooleanSettingOption[], value: boolean};
export type EnumSetting = BaseSetting&{options: EnumSettingOption[], value: string};
export type Setting = EnumSetting|BooleanSetting;

export class LayoutPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  set data(data: LayoutPaneData) {
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
