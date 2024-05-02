// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

export type UserFlow = PuppeteerReplay.Schema.UserFlow;
export type Step = PuppeteerReplay.Schema.Step;
export type NavigationEvent = PuppeteerReplay.Schema.NavigationEvent;
export type Target = PuppeteerReplay.Schema.Target;
export type FrameSelector = PuppeteerReplay.Schema.FrameSelector;
export type ChangeStep = PuppeteerReplay.Schema.ChangeStep;
export type ClickStep = PuppeteerReplay.Schema.ClickStep;
export type DoubleClickStep = PuppeteerReplay.Schema.DoubleClickStep;
export type HoverStep = PuppeteerReplay.Schema.HoverStep;
export type KeyDownStep = PuppeteerReplay.Schema.KeyDownStep;
export type KeyUpStep = PuppeteerReplay.Schema.KeyUpStep;
export type SetViewportStep = PuppeteerReplay.Schema.SetViewportStep;
export type EmulateNetworkConditionsStep = PuppeteerReplay.Schema.EmulateNetworkConditionsStep;
export type Selector = PuppeteerReplay.Schema.Selector;
export type StepWithSelectors = PuppeteerReplay.Schema.StepWithSelectors;
export type AssertedEvent = PuppeteerReplay.Schema.AssertedEvent;
export type NavigateStep = PuppeteerReplay.Schema.NavigateStep;
export type ScrollStep = PuppeteerReplay.Schema.ScrollStep;
export type AssertionStep = PuppeteerReplay.Schema.AssertionStep;
export type ClickAttributes = PuppeteerReplay.Schema.ClickAttributes;
export type Key = PuppeteerReplay.Schema.Key;
export {AssertedEventType, StepType, SelectorType} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
