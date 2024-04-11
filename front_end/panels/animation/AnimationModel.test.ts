// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';

import * as Animation from './animation.js';

describeWithMockConnection('AnimationModel', () => {
  afterEach(() => {
    clearAllMockConnectionResponseHandlers();
  });

  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      new Animation.AnimationModel.AnimationModel(target);
    });
  });

  describe('AnimationImpl', () => {
    it('setPayload should update values returned from the relevant value functions for time based animations',
       async () => {
         const target = createTarget();
         const model = new Animation.AnimationModel.AnimationModel(target);
         const animationImpl = await Animation.AnimationModel.AnimationImpl.parsePayload(model, {
           id: '1',
           name: 'animation-name',
           pausedState: false,
           playbackRate: 1,
           startTime: 0,
           currentTime: 0,
           type: Protocol.Animation.AnimationType.CSSAnimation,
           playState: 'running',
           source: {
             delay: 0,
             endDelay: 0,
             iterationStart: 0,
             iterations: 1,
             duration: 100,
             direction: 'forward',
             fill: 'forwards',
             easing: 'linear',
           },
         });
         assert.strictEqual(animationImpl.name(), 'animation-name');
         assert.strictEqual(animationImpl.paused(), false);
         assert.strictEqual(animationImpl.playState(), 'running');
         assert.strictEqual(animationImpl.playbackRate(), 1);
         assert.strictEqual(animationImpl.startTime(), 0);
         assert.strictEqual(animationImpl.currentTime(), 0);
         assert.strictEqual(animationImpl.iterationDuration(), 100);
         assert.strictEqual(animationImpl.delayOrStartTime(), 0);
         assert.strictEqual(animationImpl.type(), Protocol.Animation.AnimationType.CSSAnimation);

         await animationImpl.setPayload({
           id: '1',
           name: 'updated-name',
           pausedState: true,
           playbackRate: 2,
           startTime: 100,
           currentTime: 120,
           type: Protocol.Animation.AnimationType.CSSTransition,
           playState: 'paused',
           source: {
             delay: 10,
             endDelay: 10,
             iterationStart: 20,
             iterations: 2,
             duration: 120,
             direction: 'reverse',
             fill: 'backward',
             easing: 'ease',
           },
         });

         assert.strictEqual(animationImpl.name(), 'updated-name');
         assert.strictEqual(animationImpl.paused(), true);
         assert.strictEqual(animationImpl.playState(), 'paused');
         assert.strictEqual(animationImpl.playbackRate(), 2);
         assert.strictEqual(animationImpl.startTime(), 100);
         assert.strictEqual(animationImpl.currentTime(), 120);
         assert.strictEqual(animationImpl.iterationDuration(), 120);
         assert.strictEqual(animationImpl.delayOrStartTime(), 10);
         assert.strictEqual(animationImpl.type(), Protocol.Animation.AnimationType.CSSTransition);
       });

    it('setPayload should update values returned from the relevant value functions for scroll based animations',
       async () => {
         setMockConnectionResponseHandler('Runtime.evaluate', () => {
           return {
             result: {
               type: 'number',
               value: 1,
             },
           };
         });
         const target = createTarget();
         const model = new Animation.AnimationModel.AnimationModel(target);
         const animationImpl = await Animation.AnimationModel.AnimationImpl.parsePayload(model, {
           id: '1',
           name: 'animation-name',
           pausedState: false,
           playbackRate: 1,
           startTime: 0,
           currentTime: 0,
           type: Protocol.Animation.AnimationType.CSSAnimation,
           playState: 'running',
           source: {
             delay: 0,
             endDelay: 0,
             iterationStart: 0,
             iterations: 1,
             duration: 100,
             direction: 'forward',
             fill: 'forwards',
             easing: 'linear',
           },
           viewOrScrollTimeline: {
             axis: Protocol.DOM.ScrollOrientation.Vertical,
             startOffset: 100,
             endOffset: 200,
             sourceNodeId: 1 as Protocol.DOM.BackendNodeId,
           },
         });
         assert.strictEqual(animationImpl.name(), 'animation-name');
         assert.strictEqual(animationImpl.paused(), false);
         assert.strictEqual(animationImpl.playState(), 'running');
         assert.strictEqual(animationImpl.playbackRate(), 1);
         assert.strictEqual(animationImpl.startTime(), 100);  // in pixels
         assert.strictEqual(animationImpl.currentTime(), 0);
         assert.strictEqual(animationImpl.iterationDuration(), 100);  // in pixels
         assert.strictEqual(animationImpl.delayOrStartTime(), 100);   // in pixels

         await animationImpl.setPayload({
           id: '1',
           name: 'updated-name',
           pausedState: true,
           playbackRate: 2,
           startTime: 0,
           currentTime: 120,
           type: Protocol.Animation.AnimationType.CSSAnimation,
           playState: 'paused',
           source: {
             delay: 10,
             endDelay: 10,
             iterationStart: 20,
             iterations: 2,
             duration: 20,
             direction: 'reverse',
             fill: 'backward',
             easing: 'ease',
           },
           viewOrScrollTimeline: {
             axis: Protocol.DOM.ScrollOrientation.Horizontal,
             startOffset: 0,
             endOffset: 100,
             sourceNodeId: 1 as Protocol.DOM.BackendNodeId,
           },
         });

         assert.strictEqual(animationImpl.name(), 'updated-name');
         assert.strictEqual(animationImpl.paused(), true);
         assert.strictEqual(animationImpl.playState(), 'paused');
         assert.strictEqual(animationImpl.playbackRate(), 2);
         assert.strictEqual(animationImpl.startTime(), 0);           // in pixels
         assert.strictEqual(animationImpl.currentTime(), 120);       // in pixels
         assert.strictEqual(animationImpl.iterationDuration(), 20);  // in pixels
         assert.strictEqual(animationImpl.delayOrStartTime(), 0);    // in pixels
       });
  });
});
