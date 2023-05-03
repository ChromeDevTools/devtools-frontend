// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {
  type Schema,
  StepType,
  AssertedEventType,
  SelectorType,
} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

export type UserFlow = Schema.UserFlow;
export type Step = Schema.Step;
export type NavigationEvent = Schema.NavigationEvent;
export type Target = Schema.Target;
export type FrameSelector = Schema.FrameSelector;
export type ChangeStep = Schema.ChangeStep;
export type ClickStep = Schema.ClickStep;
export type DoubleClickStep = Schema.DoubleClickStep;
export type HoverStep = Schema.HoverStep;
export type KeyDownStep = Schema.KeyDownStep;
export type KeyUpStep = Schema.KeyUpStep;
export type SetViewportStep = Schema.SetViewportStep;
export type EmulateNetworkConditionsStep = Schema.EmulateNetworkConditionsStep;
export type Selector = Schema.Selector;
export type StepWithSelectors = Schema.StepWithSelectors;
export type AssertedEvent = Schema.AssertedEvent;
export type NavigateStep = Schema.NavigateStep;
export type ScrollStep = Schema.ScrollStep;
export type AssertionStep = Schema.AssertionStep;
export type ClickAttributes = Schema.ClickAttributes;
export type Key = Schema.Key;
export {AssertedEventType, StepType, SelectorType};
