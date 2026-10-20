// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as AiUtils from '../ai-utils/ai-utils.js';

import type {ToolName} from './tools/Tool.js';

export const enum Events {
  TOOLS_CHANGED = 'ToolsChanged',
}

export interface EventTypes {
  [Events.TOOLS_CHANGED]: void;
}

export class AlwaysAllowedTools extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #impl: Impl;

  constructor(settings: Common.Settings.Settings) {
    super();
    const onChange = (): void => this.dispatchEventToListeners(Events.TOOLS_CHANGED);
    this.#impl =
        AiUtils.AiUtils.isNaturalLanguageInterfaceEnabled() ? new SettingImpl(settings, onChange) : new DisabledImpl();
  }

  isAllowed(toolName: ToolName): boolean {
    return this.#impl.isAllowed(toolName);
  }

  allow(toolName: ToolName): void {
    this.#impl.allow(toolName);
  }

  remove(toolName: ToolName): void {
    this.#impl.remove(toolName);
  }

  list(): readonly ToolName[] {
    return this.#impl.list();
  }
}

interface Impl {
  isAllowed(toolName: ToolName): boolean;
  allow(toolName: ToolName): void;
  remove(toolName: ToolName): void;
  list(): readonly ToolName[];
}

/**
 * Actual implementation.
 */
class SettingImpl implements Impl {
  readonly #setting: Common.Settings.Setting<ToolName[]>;

  constructor(settings: Common.Settings.Settings, onChange: () => void) {
    this.#setting = settings.createSetting<ToolName[]>('ai-assistance-always-allowed-tools', []);
    this.#setting.addChangeListener(onChange);
  }

  isAllowed(toolName: ToolName): boolean {
    return this.#setting.get().includes(toolName);
  }

  allow(toolName: ToolName): void {
    this.#setting.set([...new Set([...this.#setting.get(), toolName])]);
  }

  remove(toolName: ToolName): void {
    const toolNames = this.#setting.get().filter(tn => tn !== toolName);
    this.#setting.set([...new Set(toolNames)]);
  }

  list(): readonly ToolName[] {
    return [...new Set(this.#setting.get())];
  }
}

/**
 * Fake implementation when natural language interface is disabled.
 */
class DisabledImpl implements Impl {
  isAllowed(): boolean {
    return false;
  }

  allow(): void {
  }

  remove(): void {
  }

  list(): readonly ToolName[] {
    return [];
  }
}
