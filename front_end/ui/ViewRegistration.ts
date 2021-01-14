// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

import {ViewLocationResolver} from './View.js';  // eslint-disable-line no-unused-vars
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
  NAVIGATOR_VIEW = 'navigator-view',
  DRAWER_VIEW = 'drawer-view',
  NETWORK_SIDEBAR = 'network-sidebar',
}

export interface ViewRegistration {
  experiment?: Root.Runtime.ExperimentName;
  condition?: Root.Runtime.ConditionName;
  commandPrompt: string;
  title: Platform.UIString.LocalizedString;
  persistence?: ViewPersistence;
  id: string;
  location?: ViewLocationValues;
  hasToolbar?: boolean;
  loadView: () => Promise<Widget>;
  order?: number;
  settings?: Array<string>;
  tags?: Array<string>;
}

export function registerViewExtension(registration: ViewRegistration): void {
  registeredViewExtensions.push(new PreRegisteredView(registration));
}

export function getRegisteredViewExtensions(): Array<PreRegisteredView> {
  return registeredViewExtensions.filter(
      view => Root.Runtime.Runtime.isDescriptorEnabled({experiment: view.experiment(), condition: view.condition()}));
}

const registeredLocationResolvers: Array<LocationResolverRegistration> = [];

const viewLocationNameSet = new Set<ViewLocationValues>();

export function registerLocationResolver(registration: LocationResolverRegistration): void {
  const locationName = registration.name;
  if (viewLocationNameSet.has(locationName)) {
    throw new Error(`Duplicate view location name registration '${locationName}'`);
  }
  viewLocationNameSet.add(locationName);
  registeredLocationResolvers.push(registration);
}

export function getRegisteredLocationResolvers(): Array<LocationResolverRegistration> {
  return registeredLocationResolvers;
}

export const ViewLocationCategoryValues = {
  ELEMENTS: ls`Elements`,
  DRAWER: ls`Drawer`,
  DRAWER_SIDEBAR: ls`Drawer sidebar`,
  PANEL: ls`Panel`,
  NETWORK: ls`Network`,
  SETTINGS: ls`Settings`,
  SOURCES: ls`Sources`,
};

type ViewLocationCategory = typeof ViewLocationCategoryValues[keyof typeof ViewLocationCategoryValues];

export interface LocationResolverRegistration {
  name: ViewLocationValues;
  category: ViewLocationCategory;
  loadResolver: () => Promise<ViewLocationResolver>;
}
