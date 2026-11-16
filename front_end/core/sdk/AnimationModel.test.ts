// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

function createAnimationPayload(payload: Partial<Protocol.Animation.Animation>): Protocol.Animation.Animation {
  return {
    id: '1',
    name: 'animation-name',
    pausedState: false,
    playbackRate: 1,
    startTime: 0,
    currentTime: 0,
    type: Protocol.Animation.AnimationType.CSSAnimation,
    playState: 'running',
    ...payload,
    source: {
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      delay: 0,
      endDelay: 0,
      iterationStart: 0,
      iterations: 1,
      duration: 100,
      direction: 'forward',
      fill: 'forwards',
      easing: 'linear',
      ...(payload.source ? payload.source : null),
    },
  };
}

describe('AnimationModel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = universe.createTarget();
      new SDK.AnimationModel.AnimationModel(target);
    });
  });

  describe('getAnimationGroupForAnimation', () => {
    const NODE_ID = 1 as Protocol.DOM.NodeId;
    beforeEach(() => {
      const stubDOMNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      stubDOMNode.id = NODE_ID;
      sinon.stub(SDK.AnimationModel.AnimationEffect.prototype, 'node').resolves(stubDOMNode);
    });

    it('should resolve the containing animation group if the animation with given name and node id exists in the group',
       async () => {
         const target = universe.createTarget();
         const model = new SDK.AnimationModel.AnimationModel(target);
         const animationGroupStartedPromiseWithResolvers = Promise.withResolvers<void>();
         model.addEventListener(SDK.AnimationModel.Events.AnimationGroupStarted, () => {
           animationGroupStartedPromiseWithResolvers.resolve();
         });
         void model.animationStarted(createAnimationPayload({name: 'animation-name'}));
         await animationGroupStartedPromiseWithResolvers.promise;

         const receivedAnimationGroup = await model.getAnimationGroupForAnimation('animation-name', NODE_ID);
         assert.isNotNull(receivedAnimationGroup);
       });

    it('should resolve null if there is no animations with matching name', async () => {
      const target = universe.createTarget();
      const model = new SDK.AnimationModel.AnimationModel(target);
      const animationGroupStartedPromiseWithResolvers = Promise.withResolvers<void>();
      model.addEventListener(SDK.AnimationModel.Events.AnimationGroupStarted, () => {
        animationGroupStartedPromiseWithResolvers.resolve();
      });
      void model.animationStarted(createAnimationPayload({name: 'animation-name'}));
      await animationGroupStartedPromiseWithResolvers.promise;

      const receivedAnimationGroup = await model.getAnimationGroupForAnimation('not-a-matching-name', NODE_ID);
      assert.isNull(receivedAnimationGroup);
    });

    it('should resolve null if there is an animation with the same name but for a different node id', async () => {
      const target = universe.createTarget();
      const model = new SDK.AnimationModel.AnimationModel(target);
      const animationGroupStartedPromiseWithResolvers = Promise.withResolvers<void>();
      model.addEventListener(SDK.AnimationModel.Events.AnimationGroupStarted, () => {
        animationGroupStartedPromiseWithResolvers.resolve();
      });
      void model.animationStarted(createAnimationPayload({name: 'animation-name'}));
      await animationGroupStartedPromiseWithResolvers.promise;

      const receivedAnimationGroup =
          await model.getAnimationGroupForAnimation('animation-name', 9999 as Protocol.DOM.NodeId);
      assert.isNull(receivedAnimationGroup);
    });
  });

  it('rehydrates a forgotten animation group from a later update', async () => {
    const target = universe.createTarget();
    const model = new SDK.AnimationModel.AnimationModel(target);
    const releaseAnimations = sinon.spy(model.agent, 'invoke_releaseAnimations');
    let groupStarted = Promise.withResolvers<SDK.AnimationModel.AnimationGroup>();
    model.addEventListener(SDK.AnimationModel.Events.AnimationGroupStarted, event => {
      groupStarted.resolve(event.data);
    });

    await model.animationStarted(createAnimationPayload({startTime: 0}));
    const originalGroup = await groupStarted.promise;
    originalGroup.forget();

    assert.isFalse(model.animationGroups.has(originalGroup.id()));
    sinon.assert.notCalled(releaseAnimations);

    groupStarted = Promise.withResolvers<SDK.AnimationModel.AnimationGroup>();
    await model.animationUpdated(createAnimationPayload({startTime: 100}));
    const restoredGroup = await groupStarted.promise;

    assert.notStrictEqual(restoredGroup, originalGroup);
    assert.strictEqual(restoredGroup.startTime(), 100);
    assert.strictEqual(model.animationGroups.get(restoredGroup.id()), restoredGroup);
    sinon.assert.notCalled(releaseAnimations);
  });

  describe('AnimationGroup', () => {
    let model: SDK.AnimationModel.AnimationModel;

    beforeEach(() => {
      model = new SDK.AnimationModel.AnimationModel(universe.createTarget());
    });

    async function createGroup(payloads: Array<Partial<Protocol.Animation.Animation>>):
        Promise<SDK.AnimationModel.AnimationGroup> {
      const animations = await Promise.all(payloads.map(
          payload => SDK.AnimationModel.AnimationImpl.parsePayload(model, createAnimationPayload(payload))));
      return new SDK.AnimationModel.AnimationGroup(model, 'group', animations);
    }

    it('reuses the matching historical group after rejecting a different group', async () => {
      const clock = sinon.useFakeTimers();
      try {
        await model.animationStarted(createAnimationPayload({id: '1', cssId: 'rule-a'}));
        await clock.tickAsync(100);
        await model.animationStarted(createAnimationPayload({id: '2', cssId: 'rule-b', startTime: 100}));
        await clock.tickAsync(100);
        assert.strictEqual(model.animationGroups.size, 2);
        const replayedGroup = model.animationGroups.get('2');
        assert.exists(replayedGroup);

        await model.animationStarted(createAnimationPayload({id: '3', cssId: 'rule-b', startTime: 200}));
        await clock.tickAsync(100);

        const groups = [...model.animationGroups.values()];
        assert.lengthOf(groups, 2);
        assert.strictEqual(groups[0].animations()[0].id(), '1');
        assert.strictEqual(groups[1], replayedGroup);
        assert.strictEqual(groups[1].animations()[0].id(), '3');
      } finally {
        clock.restore();
      }
    });

    it('replays animations using per-animation current times', async () => {
      const group = await createGroup([{id: '1'}, {id: '2'}]);
      const seek = sinon.stub(model.agent, 'invoke_seekAnimations').resolves({getError: () => undefined});

      group.seekTo(0);

      sinon.assert.calledOnceWithExactly(seek, {animations: ['1', '2'], currentTimes: [0, 0]});
    });

    it('seeks animations in one request while seeking reversed animations from their ends', async () => {
      const longerAnimation = createAnimationPayload({id: '3', playbackRate: -1, startTime: 200});
      longerAnimation.source = {...longerAnimation.source!, duration: 200};
      const group = await createGroup([
        {id: '1'},
        {id: '2', playbackRate: -1, startTime: 100},
        longerAnimation,
        {id: '4', playbackRate: 0},
        {id: '5', playbackRate: -1},
      ]);
      const seek = sinon.stub(model.agent, 'invoke_seekAnimations').resolves({getError: () => undefined});

      group.seekTo(25);

      sinon.assert.calledOnceWithExactly(seek,
                                         {animations: ['1', '2', '3', '4', '5'], currentTimes: [25, 75, 175, 25, 75]});
    });

    function withSource(payload: Partial<Protocol.Animation.Animation>,
                        source: Partial<Protocol.Animation.AnimationEffect>): Protocol.Animation.Animation {
      const result = createAnimationPayload(payload);
      result.source = {...result.source!, ...source};
      return result;
    }

    for (const type of [Protocol.Animation.AnimationType.CSSAnimation,
                        Protocol.Animation.AnimationType.CSSTransition,
    ]) {
      it(`matches a replayed ${type} with a new protocol ID by its cssId`, async () => {
        const first = await createGroup([{id: '1', type, cssId: 'rule-a'}, {id: '2', type, cssId: 'rule-b'}]);
        const second = await createGroup(
            [{id: '4', type, cssId: 'rule-b', startTime: 100}, {id: '3', type, cssId: 'rule-a', startTime: 100}]);

        assert.isTrue(first.matches(second));
        assert.isTrue(second.matches(first));
      });

      it(`does not match a ${type} with a different cssId`, async () => {
        const first = await createGroup([{id: '1', type, cssId: 'rule-a'}]);
        const second = await createGroup([{id: '2', type, cssId: 'rule-b'}]);

        assert.isFalse(first.matches(second));
      });
    }

    it('does not match the same CSS rule applied to a different element', async () => {
      const first = await createGroup([{id: '1', cssId: 'rule-a'}]);
      const second =
          await createGroup([withSource({id: '2', cssId: 'rule-a'}, {backendNodeId: 2 as Protocol.DOM.BackendNodeId})]);

      assert.isFalse(first.matches(second));
    });

    it('distinguishes CSS animations declared in the same rule by name', async () => {
      const first = await createGroup([{id: '1', cssId: 'rule-a', name: 'fade'}]);
      const second = await createGroup([{id: '2', cssId: 'rule-a', name: 'slide'}]);

      assert.isFalse(first.matches(second));
    });

    it('matches a replayed Web Animation with a new protocol ID by its fingerprint', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const first = await createGroup([{id: '1', type}]);
      const second = await createGroup([{id: '2', type, startTime: 100}]);

      assert.isTrue(first.matches(second));
    });

    it('matches Web Animations despite different mutable effect details', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const first = await createGroup([{id: '1', type}]);
      const second = await createGroup([withSource({id: '2', type}, {
        duration: 200,
        delay: 50,
        endDelay: 50,
        iterationStart: 0.5,
        iterations: 2,
        direction: 'reverse',
        fill: 'both',
        easing: 'ease-in',
      })]);

      assert.isTrue(first.matches(second));
      assert.isTrue(second.matches(first));
    });

    it('accepts false-positive matches between Web Animations with different keyframe data', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const keyframes = (offsets: string[], easing: string): Protocol.Animation.KeyframesRule => ({
        keyframes: offsets.map(offset => ({offset, easing})),
      });
      const first =
          await createGroup([withSource({id: '1', type}, {keyframesRule: keyframes(['0%', '100%'], 'linear')})]);
      const second = await createGroup(
          [withSource({id: '2', type}, {keyframesRule: keyframes(['0%', '50%', '100%'], 'ease-in')})]);

      assert.isTrue(first.matches(second));
    });

    it('matches a replay after editing timing and keyframe offsets', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const payload = withSource({id: '1', type}, {keyframesRule: {keyframes: [{offset: '50%', easing: 'linear'}]}});
      const first = await createGroup([payload]);
      const replay = await createGroup([{...payload, id: '2', startTime: 100}]);
      const source = first.animations()[0].source();
      const keyframesRule = source.keyframesRule();
      assert.isNotNull(keyframesRule);

      source.durationInternal = 200;
      source.delayInternal = 50;
      keyframesRule.keyframes()[0].setOffset(0.75);

      assert.isTrue(first.matches(replay));
    });

    it('distinguishes Web Animations by name', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const first = await createGroup([{id: '1', type, name: 'fade'}]);
      const second = await createGroup([{id: '2', type, name: 'slide'}]);

      assert.isFalse(first.matches(second));
    });

    it('does not match Web Animations on different elements', async () => {
      const type = Protocol.Animation.AnimationType.WebAnimation;
      const first = await createGroup([{id: '1', type}]);
      const second = await createGroup([withSource({id: '2', type}, {backendNodeId: 2 as Protocol.DOM.BackendNodeId})]);

      assert.isFalse(first.matches(second));
    });

    it('does not match the same animation on a different scroll timeline', async () => {
      sinon.stub(model, 'devicePixelRatio').resolves(1);
      const timeline = (sourceNodeId: number): Protocol.Animation.ViewOrScrollTimeline => ({
        sourceNodeId: sourceNodeId as Protocol.DOM.BackendNodeId,
        axis: Protocol.DOM.ScrollOrientation.Vertical,
        startOffset: 0,
        endOffset: 100,
      });
      const first = await createGroup([{id: '1', cssId: 'rule-a', viewOrScrollTimeline: timeline(10)}]);
      const replay = await createGroup([{id: '2', cssId: 'rule-a', viewOrScrollTimeline: timeline(10)}]);
      const other = await createGroup([{id: '3', cssId: 'rule-a', viewOrScrollTimeline: timeline(11)}]);

      assert.isTrue(first.matches(replay));
      assert.isFalse(first.matches(other));
    });

    it('keeps duplicate participants when matching', async () => {
      const first =
          await createGroup([{id: '1', cssId: 'rule-a'}, {id: '2', cssId: 'rule-a'}, {id: '3', cssId: 'rule-b'}]);
      const second =
          await createGroup([{id: '4', cssId: 'rule-a'}, {id: '5', cssId: 'rule-b'}, {id: '6', cssId: 'rule-b'}]);

      assert.isFalse(first.matches(second));
      assert.isFalse(second.matches(first));
    });

    it('requires the complete set of participants', async () => {
      const first = await createGroup([{id: '1', cssId: 'rule-a'}, {id: '2', cssId: 'rule-b'}]);
      const second = await createGroup([{id: '3', cssId: 'rule-a'}, {id: '4', cssId: 'rule-c'}]);

      assert.isFalse(first.matches(second));
      assert.isFalse(second.matches(first));
    });

    it('updates its identity after appending animations', async () => {
      const first = await createGroup([{id: '1', cssId: 'rule-a'}]);
      const second = await createGroup([{id: '3', cssId: 'rule-a'}, {id: '4', cssId: 'rule-b'}]);
      const appended = await createGroup([{id: '2', cssId: 'rule-b'}]);

      assert.isFalse(first.matches(second));
      first.appendAnimations(appended.animations());
      assert.isTrue(first.matches(second));
    });

    it('does not release retained animation objects when rebasing', async () => {
      const first = await createGroup([{id: '1'}]);
      const second = await createGroup([{id: '1', startTime: 100}]);
      const release = sinon.stub(model, 'releaseAnimations');

      first.rebaseTo(second);

      sinon.assert.notCalled(release);
      assert.strictEqual(first.animations(), second.animations());
      assert.isTrue(first.matches(second));
    });

    it('releases only replaced animation objects and updates its identity when rebasing', async () => {
      const first = await createGroup([{id: '1'}, {id: '2'}]);
      const second = await createGroup([{id: '2'}, {id: '3'}]);
      const release = sinon.stub(model, 'releaseAnimations');

      first.rebaseTo(second);

      sinon.assert.calledOnceWithExactly(release, ['1']);
      assert.isTrue(first.matches(second));
    });
  });

  describe('AnimationImpl', () => {
    it('setPayload should update values returned from the relevant value functions for time based animations',
       async () => {
         const target = universe.createTarget();
         const model = new SDK.AnimationModel.AnimationModel(target);
         const animationImpl = await SDK.AnimationModel.AnimationImpl.parsePayload(model, {
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
         assert.isFalse(animationImpl.paused());
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
         assert.isTrue(animationImpl.paused());
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
         const connection = new MockCDPConnection();
         connection.setSuccessHandler('Runtime.evaluate', () => ({
                                                            result: {
                                                              type: Protocol.Runtime.RemoteObjectType.Number,
                                                              value: 1,
                                                            },
                                                          } as Protocol.Runtime.EvaluateResponse));
         const target = universe.createTarget({connection});
         const model = new SDK.AnimationModel.AnimationModel(target);
         const animationImpl = await SDK.AnimationModel.AnimationImpl.parsePayload(model, {
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
         assert.isFalse(animationImpl.paused());
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
         assert.isTrue(animationImpl.paused());
         assert.strictEqual(animationImpl.playState(), 'paused');
         assert.strictEqual(animationImpl.playbackRate(), 2);
         assert.strictEqual(animationImpl.startTime(), 0);           // in pixels
         assert.strictEqual(animationImpl.currentTime(), 120);       // in pixels
         assert.strictEqual(animationImpl.iterationDuration(), 20);  // in pixels
         assert.strictEqual(animationImpl.delayOrStartTime(), 0);    // in pixels
       });
  });
});
