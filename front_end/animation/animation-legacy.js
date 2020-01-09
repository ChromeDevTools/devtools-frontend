// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AnimationModule from './animation.js';

self.Animation = self.Animation || {};
Animation = Animation || {};

/**
 * @constructor
 * @unrestricted
 */
Animation.AnimationGroupPreviewUI = AnimationModule.AnimationGroupPreviewUI.AnimationGroupPreviewUI;

/**
 * @constructor
 */
Animation.AnimationModel = AnimationModule.AnimationModel.AnimationModel;

/** @enum {symbol} */
Animation.AnimationModel.Events = AnimationModule.AnimationModel.Events;

/**
 * @constructor
 */
Animation.AnimationModel.Animation = AnimationModule.AnimationModel.AnimationImpl;

/** @enum {string} */
Animation.AnimationModel.Animation.Type = AnimationModule.AnimationModel.Type;

/**
 * @constructor
 */
Animation.AnimationModel.AnimationEffect = AnimationModule.AnimationModel.AnimationEffect;

/**
 * @constructor
 */
Animation.AnimationModel.KeyframesRule = AnimationModule.AnimationModel.KeyframesRule;

/**
 * @constructor
 */
Animation.AnimationModel.KeyframeStyle = AnimationModule.AnimationModel.KeyframeStyle;

/**
 * @constructor
 */
Animation.AnimationModel.AnimationGroup = AnimationModule.AnimationModel.AnimationGroup;

/**
 * @constructor
 */
Animation.AnimationModel.ScreenshotCapture = AnimationModule.AnimationModel.ScreenshotCapture;

/**
 * @constructor
 */
Animation.AnimationDispatcher = AnimationModule.AnimationModel.AnimationDispatcher;

/**
 * @unrestricted
 * @constructor
 */
Animation.AnimationScreenshotPopover = AnimationModule.AnimationScreenshotPopover.AnimationScreenshotPopover;

/**
 * @implements {SDK.SDKModelObserver<!Animation.AnimationModel>}
 * @constructor
 * @unrestricted
 */
Animation.AnimationTimeline = AnimationModule.AnimationTimeline.AnimationTimeline;

Animation.AnimationTimeline.GlobalPlaybackRates = AnimationModule.AnimationTimeline.GlobalPlaybackRates;

/**
 * @unrestricted
 * @constructor
 */
Animation.AnimationTimeline.NodeUI = AnimationModule.AnimationTimeline.NodeUI;

/**
 * @unrestricted
 * @constructor
 */
Animation.AnimationTimeline.StepTimingFunction = AnimationModule.AnimationTimeline.StepTimingFunction;

/**
 * @constructor
 */
Animation.AnimationUI = AnimationModule.AnimationUI.AnimationUI;

/**
 * @enum {string}
 */
Animation.AnimationUI.MouseEvents = AnimationModule.AnimationUI.MouseEvents;

Animation.AnimationUI.Options = AnimationModule.AnimationUI.Options;

Animation.AnimationUI.Colors = AnimationModule.AnimationUI.Colors;

/** @typedef {{ endTime: number, screenshots: !Array.<string>}} */
Animation.AnimationModel.ScreenshotCapture.Request;
