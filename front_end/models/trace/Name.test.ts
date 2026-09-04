// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace, getMainThread} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Trace from './trace.js';

describeWithEnvironment('Name', () => {
  describe('with web-dev-with-commit trace', () => {
    let parsedTrace: Trace.TraceModel.ParsedTrace;

    before(async function() {
      parsedTrace =
          await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz', undefined, {withTimelinePanel: false});
    });

    it('uses the URL for the name of a network request', () => {
      const request = parsedTrace.data.NetworkRequests.byTime.at(0);
      assert.isOk(request);
      const name = Trace.Name.forEntry(request);
      assert.strictEqual(name, 'web.dev/ (web.dev)');
    });

    it('uses "Frame" for timeline frames', () => {
      const frame = parsedTrace.data.Frames.frames.at(0);
      assert.isOk(frame);
      const name = Trace.Name.forEntry(frame);
      assert.strictEqual(name, 'Frame');
    });

    it('uses the names defined in the entry styles', () => {
      const entry = allThreadEntriesInTrace(parsedTrace).find(e => e.name === Trace.Types.Events.Name.RUN_TASK);
      assert.isOk(entry);

      const name = Trace.Name.forEntry(entry, parsedTrace);
      assert.strictEqual(name, 'Task');
    });
  });

  it('adds the event type for EventDispatch events', () => {
    const clickEvent = {
      name: Trace.Types.Events.Name.EVENT_DISPATCH,
      ph: Trace.Types.Events.Phase.COMPLETE,
      cat: 'devtools.timeline',
      args: {data: {type: 'click'}},
    } as unknown as Trace.Types.Events.Dispatch;
    const name = Trace.Name.forEntry(clickEvent);
    assert.strictEqual(name, 'Event: click');
  });

  it('correctly titles layout shifts', () => {
    const shift = {
      name: Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT,
      args: {},
    } as unknown as Trace.Types.Events.SyntheticLayoutShift;
    const title = Trace.Name.forEntry(shift);
    assert.strictEqual(title, 'Layout shift');
  });

  it('correctly titles animation events', () => {
    const animation = {
      name: Trace.Types.Events.Name.ANIMATION,
      cat: 'devtools.timeline',
      args: {},
    } as unknown as Trace.Types.Events.Animation;
    const title = Trace.Name.forEntry(animation);
    assert.strictEqual(title, 'Animation');
  });

  it('returns the name and URL for a WebSocketCreate event', () => {
    const createEvent = {
      name: Trace.Types.Events.Name.WEB_SOCKET_CREATE,
      args: {data: {url: 'wss://echo.websocket.org/'}},
    } as unknown as Trace.Types.Events.WebSocketCreate;
    const name = Trace.Name.forEntry(createEvent);
    assert.strictEqual(name, 'WebSocket opened: wss://echo.websocket.org/');
  });

  it('returns a custom name for WebSocket destroy events', () => {
    const fakeDestroyEvent = {
      name: Trace.Types.Events.Name.WEB_SOCKET_DESTROY,
    } as unknown as Trace.Types.Events.WebSocketDestroy;

    const name = Trace.Name.forEntry(fakeDestroyEvent);
    assert.strictEqual(name, 'WebSocket closed');
  });

  it('returns a custom name for pointer interactions', () => {
    const interaction = {
      name: 'EventTiming',
      interactionId: 1,
      type: 'pointerdown',
      args: {data: {beginEvent: {}, endEvent: {}}},
    } as unknown as Trace.Types.Events.SyntheticInteractionPair;
    const name = Trace.Name.forEntry(interaction);
    assert.strictEqual(name, 'Pointer');
  });

  it('returns a custom name for keyboard interactions', () => {
    const keydownInteraction = {
      name: 'EventTiming',
      interactionId: 1,
      type: 'keydown',
      args: {data: {beginEvent: {}, endEvent: {}}},
    } as unknown as Trace.Types.Events.SyntheticInteractionPair;
    const name = Trace.Name.forEntry(keydownInteraction);
    assert.strictEqual(name, 'Keyboard');
  });

  it('returns "other" for unknown interaction event types', () => {
    const interaction = {
      name: 'EventTiming',
      interactionId: 1,
      type: 'unknown',
      args: {data: {beginEvent: {}, endEvent: {}}},
    } as unknown as Trace.Types.Events.SyntheticInteractionPair;
    const name = Trace.Name.forEntry(interaction);
    assert.strictEqual(name, 'Other');
  });

  describe('profile calls', () => {
    let parsedTrace: Trace.TraceModel.ParsedTrace;

    before(async function() {
      parsedTrace =
          await TraceLoader.traceEngine(this, 'react-hello-world.json.gz', undefined, {withTimelinePanel: false});
    });

    it('uses the profile name for a ProfileCall if it has been set', () => {
      const {entry, profileNode} = getProfileEventAndNodeForReactTrace(parsedTrace);
      assert.isNull(profileNode.originalFunctionName);
      profileNode.setOriginalFunctionName('testing-profile-name');
      const name = Trace.Name.forEntry(entry, parsedTrace);
      assert.strictEqual(name, 'testing-profile-name');

      // Don't impact other tests.
      profileNode.setOriginalFunctionName(null);
    });

    it('falls back to the call frame name if a specific name has not been set', () => {
      const {entry, profileNode} = getProfileEventAndNodeForReactTrace(parsedTrace);
      assert.isNull(profileNode.originalFunctionName);
      const name = Trace.Name.forEntry(entry, parsedTrace);
      assert.strictEqual(name, 'performConcurrentWorkOnRoot');
    });

    /** Finds a particular event from the react-hello-world trace which is used for our test example. **/
    function getProfileEventAndNodeForReactTrace(parsedTrace: Trace.TraceModel.ParsedTrace): {
      entry: Trace.Types.Events.SyntheticProfileCall,
      profileNode: CPUProfile.ProfileTreeModel.ProfileNode,
    } {
      const mainThread = getMainThread(parsedTrace.data.Renderer);
      let foundNode: CPUProfile.ProfileTreeModel.ProfileNode|null = null;
      let foundEntry: Trace.Types.Events.SyntheticProfileCall|null = null;

      for (const entry of mainThread.entries) {
        if (Trace.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === 'performConcurrentWorkOnRoot') {
          const profile = parsedTrace.data.Samples.profilesInProcess.get(entry.pid)?.get(entry.tid);
          const node = profile?.parsedProfile.nodeById(entry.nodeId);
          if (node) {
            foundNode = node;
          }
          foundEntry = entry;
          break;
        }
      }
      if (!foundNode) {
        throw new Error('Could not find CPU Profile node.');
      }
      if (!foundEntry) {
        throw new Error('Could not find expected entry.');
      }

      return {
        entry: foundEntry,
        profileNode: foundNode,
      };
    }
  });
});
