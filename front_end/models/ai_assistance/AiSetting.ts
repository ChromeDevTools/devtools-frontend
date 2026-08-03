// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

import type {DisabledReason} from './AiUtils.js';

export const enum Events {
  CHANGED = 'Changed',
}

export interface EventTypes {
  [Events.CHANGED]: void;
}

/**
 * Wrapper around a plain {@link Common.Settings.Setting} for AI features whose availability
 * can change dynamically over the lifetime of a DevTools session (e.g., due to changes in
 * AIDA availability, network connectivity, authentication, or enterprise policy).
 *
 * This wrapper listens to {@link Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED} and emits
 * {@link Events.CHANGED} when either the underlying setting value changes or when AIDA status
 * changes, allowing UI components to dynamically react without polluting the plain `Setting`
 * class with dynamic availability state.
 */
export class AiSetting<ValueT> extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #setting?: Common.Settings.Setting<ValueT>;
  readonly #descriptor: Common.Settings.ConditionalSettingDescriptor<ValueT, DisabledReason[]>;
  readonly #hostConfigTracker: Host.AidaClient.HostConfigTracker;
  readonly #settings: Common.Settings.Settings;
  readonly #boundOnSettingChanged = this.#onSettingChanged.bind(this);
  readonly #boundOnAidaAvailabilityChanged = this.#onAidaAvailabilityChanged.bind(this);

  constructor(
      descriptor: Common.Settings.ConditionalSettingDescriptor<ValueT, DisabledReason[]>,
      hostConfigTracker: Host.AidaClient.HostConfigTracker,
      settings: Common.Settings.Settings,
  ) {
    super();
    this.#descriptor = descriptor;
    this.#hostConfigTracker = hostConfigTracker;
    this.#settings = settings;

    this.#hostConfigTracker.addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
        this.#boundOnAidaAvailabilityChanged,
    );
    this.#tryResolveSetting();
  }

  #tryResolveSetting(): void {
    const result = this.#settings.maybeResolve(this.#descriptor as
                                               Common.Settings.ConditionalSettingDescriptor<unknown, DisabledReason[]>);
    if ('setting' in result) {
      if (this.#setting !== result.setting) {
        if (this.#setting) {
          this.#setting.removeChangeListener(this.#boundOnSettingChanged);
        }
        this.#setting = result.setting as Common.Settings.Setting<ValueT>;
        this.#setting.addChangeListener(this.#boundOnSettingChanged);
      }
    }
  }

  get unavailable(): boolean {
    const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
    return availability.status === Common.Settings.SettingAvailability.UNAVAILABLE;
  }

  get disabled(): boolean {
    const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
    return availability.status === Common.Settings.SettingAvailability.DISABLED;
  }

  get disabledReasons(): DisabledReason[] {
    const availability = this.#descriptor.isAvailable(Root.Runtime.hostConfig);
    if (availability.status === Common.Settings.SettingAvailability.DISABLED) {
      return availability.reason;
    }
    return [];
  }

  getIfNotDisabled(): ValueT|undefined {
    if (this.disabled || this.unavailable) {
      return undefined;
    }
    return this.#setting?.get();
  }

  setIfNotDisabled(value: ValueT): void {
    if (this.disabled || this.unavailable) {
      return;
    }
    this.#setting?.set(value);
  }

  #onSettingChanged(): void {
    this.dispatchEventToListeners(Events.CHANGED);
  }

  #onAidaAvailabilityChanged(): void {
    this.#tryResolveSetting();
    this.dispatchEventToListeners(Events.CHANGED);
  }
}
