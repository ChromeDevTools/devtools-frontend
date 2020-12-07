// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../root/root.js';

import {PreRegisteredView} from './ViewManager.js';
import type {Widget} from './Widget.js';

const registeredViewExtensions: Array<PreRegisteredView> = [];

export const enum ViewPersistence {
  CLOSEABLE = 'closeable',
  PERMANENT = 'permanent',
  TRANSIENT = 'transient',
}

export const enum ViewLocationValues {
  PANEL = 'panel',
  SETTINGS_VIEW = 'settings-view',
  ELEMENTS_SIDEBAR = 'elements-sidebar',
  SOURCES_SIDEBAR_BOTTOM = 'sources.sidebar-bottom',
}

export interface ViewRegistration {
  experiment?: Root.Runtime.ExperimentName;
  condition?: Root.Runtime.ConditionName;
  title: string;
  persistence?: ViewPersistence;
  id: string;
  location?: ViewLocationValues;
  hasToolbar?: boolean;
  loadView: () => Promise<Widget>;
  order?: number;
  settings?: Array<string>;
  tags?: Array<string>;
}

export function registerViewExtension(registration: ViewRegistration) {
  registeredViewExtensions.push(new PreRegisteredView(registration));
}

export function getRegisteredViewExtensions(): Array<PreRegisteredView> {
  return registeredViewExtensions.filter(
      view => Root.Runtime.Runtime.isDescriptorEnabled({experiment: view.experiment(), condition: view.condition()}));
}
