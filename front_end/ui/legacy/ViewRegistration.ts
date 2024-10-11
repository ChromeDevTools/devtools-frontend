
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';

import type {ViewLocationResolver} from './View.js';
import {PreRegisteredView} from './ViewManager.js';
import type {Widget} from './Widget.js';

const UIStrings = {
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Elements' panel.
   */
  elements: 'Elements',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Drawer' panel.
   */
  drawer: 'Drawer',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Drawer sidebar' panel.
   */
  drawer_sidebar: 'Drawer sidebar',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Panel'.
   */
  panel: 'Panel',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Network' panel.
   */
  network: 'Network',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Settings' panel.
   */
  settings: 'Settings',
  /**
   *@description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Sources' panel.
   */
  sources: 'Sources',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/ViewRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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
   * A condition is a function that will make the view available if it
   * returns true, and not available, otherwise. Make sure that objects you
   * access from inside the condition function are ready at the time when the
   * setting conditions are checked.
   */
  condition?: Root.Runtime.Condition;
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
  id: Lowercase<string>;
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
  /**
   * Icon to be used next to view's title.
   */
  iconName?: string;
}

const viewIdSet = new Set<string>();
export function registerViewExtension(registration: ViewRegistration): void {
  const viewId = registration.id;
  if (viewIdSet.has(viewId)) {
    throw new Error(`Duplicate view id '${viewId}'`);
  }
  viewIdSet.add(viewId);
  registeredViewExtensions.push(new PreRegisteredView(registration));
}

export function getRegisteredViewExtensions(config: Root.Runtime.HostConfig): Array<PreRegisteredView> {
  return registeredViewExtensions.filter(
      view => Root.Runtime.Runtime.isDescriptorEnabled(
          {experiment: view.experiment(), condition: view.condition()}, config));
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
  viewIdSet.clear();
}

export const enum ViewLocationCategory {
  NONE = '',  // `NONE` must be a falsy value. Legacy code uses if-checks for the category.
  ELEMENTS = 'ELEMENTS',
  DRAWER = 'DRAWER',
  DRAWER_SIDEBAR = 'DRAWER_SIDEBAR',
  PANEL = 'PANEL',
  NETWORK = 'NETWORK',
  SETTINGS = 'SETTINGS',
  SOURCES = 'SOURCES',
}

export function getLocalizedViewLocationCategory(category: ViewLocationCategory): Platform.UIString.LocalizedString {
  switch (category) {
    case ViewLocationCategory.ELEMENTS:
      return i18nString(UIStrings.elements);
    case ViewLocationCategory.DRAWER:
      return i18nString(UIStrings.drawer);
    case ViewLocationCategory.DRAWER_SIDEBAR:
      return i18nString(UIStrings.drawer_sidebar);
    case ViewLocationCategory.PANEL:
      return i18nString(UIStrings.panel);
    case ViewLocationCategory.NETWORK:
      return i18nString(UIStrings.network);
    case ViewLocationCategory.SETTINGS:
      return i18nString(UIStrings.settings);
    case ViewLocationCategory.SOURCES:
      return i18nString(UIStrings.sources);
    case ViewLocationCategory.NONE:
      return i18n.i18n.lockedString('');
  }
}

export interface LocationResolverRegistration {
  name: ViewLocationValues;
  category: ViewLocationCategory;
  loadResolver: () => Promise<ViewLocationResolver>;
}
