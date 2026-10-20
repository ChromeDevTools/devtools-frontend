// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as AiUtils from '../ai-utils/ai-utils.js';

import type {ToolName} from './tools/Tool.js';

export class AlwaysAllowedTools {
  readonly #impl: Impl;

  constructor(settings: Common.Settings.Settings) {
    this.#impl = AiUtils.AiUtils.isNaturalLanguageInterfaceEnabled() ? new SettingImpl(settings) : new DisabledImpl();
  }

  isAllowed(toolName: ToolName): boolean {
    return this.#impl.isAllowed(toolName);
  }

  allow(toolName: ToolName): void {
    this.#impl.allow(toolName);
  }
}

interface Impl {
  isAllowed(toolName: ToolName): boolean;
  allow(toolName: ToolName): void;
}

/**
 * Actual implementation.
 */
class SettingImpl implements Impl {
  readonly #setting: Common.Settings.Setting<ToolName[]>;

  constructor(settings: Common.Settings.Settings) {
    this.#setting = settings.createSetting<ToolName[]>('ai-assistance-always-allowed-tools', []);
  }

  isAllowed(toolName: ToolName): boolean {
    return this.#setting.get().includes(toolName);
  }

  allow(toolName: ToolName): void {
    this.#setting.set([...new Set([...this.#setting.get(), toolName])]);
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
}
