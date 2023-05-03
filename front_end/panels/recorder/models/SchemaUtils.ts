// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  type Step,
  type SetViewportStep,
  type EmulateNetworkConditionsStep,
  StepType,
} from './Schema.js';
import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

export function createViewportStep(viewport: {
  clientWidth: number,
  clientHeight: number,
}): SetViewportStep {
  return {
    type: StepType.SetViewport,
    width: viewport.clientWidth,
    height: viewport.clientHeight,
    // TODO read real parameters here
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    isLandscape: false,
  };
}

export function createEmulateNetworkConditionsStep(conditions: {
  download: number,
  upload: number,
  latency: number,
}): EmulateNetworkConditionsStep {
  return {type: StepType.EmulateNetworkConditions, ...conditions};
}

export function areSelectorsEqual(stepA: Step, stepB: Step): boolean {
  if ('selectors' in stepA && 'selectors' in stepB) {
    return JSON.stringify(stepA.selectors) === JSON.stringify(stepB.selectors);
  }
  return !('selectors' in stepA) && !('selectors' in stepB);
}

export const minTimeout = 1;
export const maxTimeout = 30000;
export const parse = PuppeteerReplay.parse;
export const parseStep = PuppeteerReplay.parseStep;
