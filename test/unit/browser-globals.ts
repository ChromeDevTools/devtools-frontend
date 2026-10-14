// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

export interface KarmaMochaConfig {
  expose?: string[];
  reporter?: unknown;
  require?: unknown;
  [key: string]: unknown;
}

export interface KarmaConfig {
  mocha?: KarmaMochaConfig;
  checkoutRoot?: string;
  pathSeparator?: string;
  testIds: string[];
  skippedTests: string[];
  repetitions: number;
}

export interface Karma {
  config: KarmaConfig;
  start: () => void;
  info: (info: {total: number}) => void;
  result: (result: unknown) => void;
  complete: (data: {coverage?: unknown}) => void;
  error: (error: string|Error) => void;
}

export interface BrowserMocha extends Mocha {
  setup(options: Record<string, unknown>): void;
  utils?: {
    stringify(value: unknown): string,
  };
}

export interface MochaGlobalsNamespace {
  interfaces: Record<string, (suite: Mocha.Suite) => void>&{
    bdd: (suite: Mocha.Suite) => void,
  };
}

/**
 * The window of the Karma context page with the globals that Karma and the
 * Mocha browser bundle install.
 */
export interface KarmaWindow extends Window {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __karma__: Karma;
  mocha: BrowserMocha;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Mocha: typeof Mocha&MochaGlobalsNamespace;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __coverage__?: unknown;
}

export const karmaWindow: KarmaWindow = window as unknown as KarmaWindow;
