// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';

const UIStrings = {
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  elementsPanel: 'Elements panel',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  stylesSidebar: 'styles sidebar',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  changesDrawer: 'Changes drawer',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  issuesView: 'Issues view',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  networkPanel: 'Network panel',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  applicationPanel: 'Application panel',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  sourcesPanel: 'Sources panel',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  timelinePanel: 'Performance panel',
  /**
   *@description The UI destination when right clicking an item that can be revealed
   */
  memoryInspectorPanel: 'Memory inspector panel',
  /**
   * @description The UI destination when revealing loaded resources through the Developer Resources Panel
   */
  developerResourcesPanel: 'Developer Resources panel',
  /**
   * @description The UI destination when revealing loaded resources through the Animations panel
   */
  animationsPanel: 'Animations panel',
};
const str_ = i18n.i18n.registerUIStrings('core/common/Revealer.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

/**
 * Interface for global revealers, which are entities responsible for
 * dealing with revealing certain types of objects. For example, the
 * Sources panel will register a revealer for `UISourceCode` objects,
 * which will ensure that its visible in an editor tab.
 */
export interface Revealer<T> {
  reveal(revealable: T, omitFocus?: boolean): Promise<void>;
}

let revealerRegistry: RevealerRegistry|undefined;

/**
 * Registration for revealers, which deals with keeping a list of all possible
 * revealers, lazily instantiating them as necessary and invoking their `reveal`
 * methods depending on the _context types_ they were registered for.
 *
 * @see Revealer
 */
export class RevealerRegistry {
  private readonly registeredRevealers: RevealerRegistration<unknown>[] = [];

  /**
   * Yields the singleton instance, creating it on-demand when necessary.
   *
   * @returns the singleton instance.
   */
  static instance(): RevealerRegistry {
    if (revealerRegistry === undefined) {
      revealerRegistry = new RevealerRegistry();
    }
    return revealerRegistry;
  }

  /**
   * Clears the singleton instance (if any).
   */
  static removeInstance(): void {
    revealerRegistry = undefined;
  }

  /**
   * Register a new `Revealer` as described by the `registration`.
   *
   * @param registration the description.
   */
  register(registration: RevealerRegistration<unknown>): void {
    this.registeredRevealers.push(registration);
  }

  /**
   * Reveals the `revealable`.
   *
   * @param revealable the object to reveal.
   * @param omitFocus whether to omit focusing on the presentation of `revealable` afterwards.
   */
  async reveal(revealable: unknown, omitFocus: boolean): Promise<void> {
    const revealers = await Promise.all(
        this.getApplicableRegisteredRevealers(revealable).map(registration => registration.loadRevealer()));
    if (revealers.length < 1) {
      throw new Error(`No revealers found for ${revealable}`);
    }
    if (revealers.length > 1) {
      throw new Error(`Conflicting reveals found for ${revealable}`);
    }
    return await revealers[0].reveal(revealable, omitFocus);
  }

  getApplicableRegisteredRevealers(revealable: unknown): RevealerRegistration<unknown>[] {
    return this.registeredRevealers.filter(registration => {
      for (const contextType of registration.contextTypes()) {
        if (revealable instanceof contextType) {
          return true;
        }
      }
      return false;
    });
  }
}

export function revealDestination(revealable: unknown): string|null {
  const revealers = RevealerRegistry.instance().getApplicableRegisteredRevealers(revealable);
  for (const {destination} of revealers) {
    if (destination) {
      return destination();
    }
  }
  return null;
}

/**
 * Register a new `Revealer` as described by the `registration` on the singleton
 * {@link RevealerRegistry} instance.
 *
 * @param registration the description.
 */
export function registerRevealer<T>(registration: RevealerRegistration<T>): void {
  RevealerRegistry.instance().register(registration);
}

/**
 * Reveals the `revealable` via the singleton {@link RevealerRegistry} instance.
 *
 * @param revealable the object to reveal.
 * @param omitFocus whether to omit focusing on the presentation of `revealable` afterwards.
 */
export async function reveal(revealable: unknown, omitFocus: boolean = false): Promise<void> {
  await RevealerRegistry.instance().reveal(revealable, omitFocus);
}

export interface RevealerRegistration<T> {
  contextTypes: () => Array<abstract new(...any: any[]) => T>;
  loadRevealer: () => Promise<Revealer<T>>;
  destination?: RevealerDestination;
}

export const RevealerDestination = {
  DEVELOPER_RESOURCES_PANEL: i18nLazyString(UIStrings.developerResourcesPanel),
  ELEMENTS_PANEL: i18nLazyString(UIStrings.elementsPanel),
  STYLES_SIDEBAR: i18nLazyString(UIStrings.stylesSidebar),
  CHANGES_DRAWER: i18nLazyString(UIStrings.changesDrawer),
  ISSUES_VIEW: i18nLazyString(UIStrings.issuesView),
  NETWORK_PANEL: i18nLazyString(UIStrings.networkPanel),
  TIMELINE_PANEL: i18nLazyString(UIStrings.timelinePanel),
  APPLICATION_PANEL: i18nLazyString(UIStrings.applicationPanel),
  SOURCES_PANEL: i18nLazyString(UIStrings.sourcesPanel),
  MEMORY_INSPECTOR_PANEL: i18nLazyString(UIStrings.memoryInspectorPanel),
  ANIMATIONS_PANEL: i18nLazyString(UIStrings.animationsPanel),
};

export type RevealerDestination = () => Platform.UIString.LocalizedString;
