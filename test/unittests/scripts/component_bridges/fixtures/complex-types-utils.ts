// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface DOMNode {
  smth: string;
}

export const enum SettingType {
  a = 'a'
}

export interface BaseSettingOption {
  title: string;
}

export interface BooleanSettingOption extends BaseSettingOption {
  value: boolean;
}

export interface EnumSettingOption extends BaseSettingOption {
  value: string;
}

export interface BaseSetting {
  name: string;
  type: SettingType;
  title: string;
}

export type BooleanSetting = BaseSetting&{options: BooleanSettingOption[], value: boolean};
export type EnumSetting = BaseSetting&{options: EnumSettingOption[], value: string};
export type Setting = EnumSetting|BooleanSetting;
