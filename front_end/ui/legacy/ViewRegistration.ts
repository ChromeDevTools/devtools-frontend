
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';

import {type ViewLocationResolver} from './View.js';
import {PreRegisteredView} from './ViewManager.js';

import {type Widget} from './Widget.js';

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
  DRAWER_SIDEBAR = 'drawer-sidebar',
  NETWORK_SIDEBAR = 'network-sidebar',
  SOURCES_SIDEBAR_TOP = 'sources.sidebar-top',
  SOURCES_SIDEBAR_TABS = 'sources.sidebar-tabs',
}

export interface ViewRegistration {
  /**
   * The name of the experiment a view is associated with. Enabling and disabling the declared
   * experiment will enable and disable the view respectively.
   */
  experiment?: Root.Runtime.ExperimentName;
  /**
   * A condition represented as a string the view's availability depends on. Conditions come
   * from the queryParamsObject defined in Runtime and just as the experiment field, they determine the availability
   * of the view. A condition can be negated by prepending a ‘!’ to the value of the condition
   * property and in that case the behaviour of the view's availability will be inverted.
   */
  condition?: Root.Runtime.ConditionName;
  /**
   * The command added to the command menu used to show the view. It usually follows the shape Show <title> as it must
   * not be localized at declaration since it is localized internally when appending the commands to the command menu.
   * The existing duplication of the declaration of the title is expected to be removed once the migration to the version
   * 2 of the localization model has been completed (crbug.com/1136655).
   */
  commandPrompt: () => Platform.UIString.LocalizedString;

  /**
   * A UI string used as the title of the view.
   */
  title: () => Platform.UIString.LocalizedString;

  /**
   * Whether the view is permanently visible or can be opened temporarily.
   */
  persistence?: ViewPersistence;

  /**
   * Whether the view is a preview feature (a corresponding icon is shown then).
   */
  isPreviewFeature?: boolean;
  /**
   * Unique identifier of the view.
   */
  id: string;
  /**
   * An identifier for the location of the view. The location is resolved by
   * an extension of type '@UI.ViewLocationResolver'.
   */
  location?: ViewLocationValues;
  /**
   * Whether the view has a toolbar.
   */
  hasToolbar?: boolean;
  /**
   * Returns an instance of the class that wraps the view.
   * The common pattern for implementing this function is loading the module with the wrapping 'Widget'
   * lazily loaded. As an example:
   *
   * ```js
   * let loadedElementsModule;
   *
   * async function loadElementsModule() {
   *
   *   if (!loadedElementsModule) {
   *     loadedElementsModule = await import('./elements.js');
   *   }
   *   return loadedElementsModule;
   * }
   * UI.ViewManager.registerViewExtension({
   *   <...>
   *   async loadView() {
   *      const Elements = await loadElementsModule();
   *      return Elements.ElementsPanel.ElementsPanel.instance();
   *   },
   *   <...>
   * });
   * ```
   */
  loadView: () => Promise<Widget>;
  /**
   * Used to sort the views that appear in a shared location.
   */
  order?: number;
  /**
   * The names of the settings the registered view performs as UI for.
   */
  settings?: Array<string>;
  /**
   * Words used to find the view in the Command Menu.
   */
  tags?: Array<() => Platform.UIString.LocalizedString>;
}

const viewIdSet = new Set<string>();
export function registerViewExtension(registration: ViewRegistration): void {
  const viewId = registration.id;
  Platform.DCHECK(() => !viewIdSet.has(viewId), `Duplicate view id '${viewId}'`);
  viewIdSet.add(viewId);
  registeredViewExtensions.push(new PreRegisteredView(registration));
}

export function getRegisteredViewExtensions(): Array<PreRegisteredView> {
  return registeredViewExtensions.filter(
      view => Root.Runtime.Runtime.isDescriptorEnabled({experiment: view.experiment(), condition: view.condition()}));
}

export function maybeRemoveViewExtension(viewId: string): boolean {
  const viewIndex = registeredViewExtensions.findIndex(view => view.viewId() === viewId);
  if (viewIndex < 0 || !viewIdSet.delete(viewId)) {
    return false;
  }
  registeredViewExtensions.splice(viewIndex, 1);
  return true;
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

export function resetViewRegistration(): void {
  registeredViewExtensions.length = 0;
  registeredLocationResolvers.length = 0;
  viewLocationNameSet.clear();
}

// TODO(crbug.com/1181019)
export const ViewLocationCategoryValues = {
  ELEMENTS: 'Elements',
  DRAWER: 'Drawer',
  DRAWER_SIDEBAR: 'Drawer sidebar',
  PANEL: 'Panel',
  NETWORK: 'Network',
  SETTINGS: 'Settings',
  SOURCES: 'Sources',
};

type ViewLocationCategory = typeof ViewLocationCategoryValues[keyof typeof ViewLocationCategoryValues];

export interface LocationResolverRegistration {
  name: ViewLocationValues;
  category: ViewLocationCategory;
  loadResolver: () => Promise<ViewLocationResolver>;
}
