// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as CPUProfile from '../../../models/cpu_profile/cpu_profile.js';
import * as TraceEngine from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getMainThread} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Components from './components.js';

describeWithEnvironment('EntryName', () => {
  it('uses the URL for the name of a network request', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const request = traceData.NetworkRequests.byTime.at(0);
    assert.isOk(request);
    const name = Components.EntryName.nameForEntry(request);
    assert.strictEqual(name, 'web.dev/ (web.dev)');
  });

  it('uses "Frame" for timeline frames', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const frame = traceData.Frames.frames.at(0);
    assert.isOk(frame);
    const name = Components.EntryName.nameForEntry(frame);
    assert.strictEqual(name, 'Frame');
  });

  it('adds the event type for EventDispatch events', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const clickEvent = traceData.Renderer.allTraceEntries.find(event => {
      return TraceEngine.Types.TraceEvents.isTraceEventDispatch(event) && event.args.data.type === 'click';
    });
    assert.isOk(clickEvent);
    const name = Components.EntryName.nameForEntry(clickEvent);
    assert.strictEqual(name, 'Event: click');
  });

  it('uses the names defined in the entry styles', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entry =
        traceData.Renderer.allTraceEntries.find(e => e.name === TraceEngine.Types.TraceEvents.KnownEventName.RUN_TASK);
    assert.isOk(entry);

    const name = Components.EntryName.nameForEntry(entry, traceData);
    assert.strictEqual(name, 'Task');
  });

  it('returns the name and URL for a WebSocketCreate event', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'network-websocket-messages.json.gz');

    let createEvent: TraceEngine.Types.TraceEvents.TraceEventWebSocketCreate|null = null;
    for (const websocket of traceData.NetworkRequests.webSocket) {
      for (const event of websocket.events) {
        if (TraceEngine.Types.TraceEvents.isTraceEventWebSocketCreate(event)) {
          createEvent = event;
          break;
        }
      }
    }
    assert.isOk(createEvent);
    const name = Components.EntryName.nameForEntry(createEvent, traceData);
    assert.strictEqual(name, 'WebSocket opened: wss://echo.websocket.org/');
  });

  it('returns a custom name for WebSocket destroy events', async function() {
    const fakeDestroyEvent = {
      name: TraceEngine.Types.TraceEvents.KnownEventName.WEB_SOCKET_DESTROY,
    } as unknown as TraceEngine.Types.TraceEvents.TraceEventWebSocketDestroy;

    const name = Components.EntryName.nameForEntry(fakeDestroyEvent);
    assert.strictEqual(name, 'WebSocket closed');
  });

  it('returns a custom name for pointer interactions', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
    const firstInteraction = traceData.UserInteractions.interactionEvents.at(0);
    assert.isOk(firstInteraction);
    const name = Components.EntryName.nameForEntry(firstInteraction);
    assert.strictEqual(name, 'Pointer');
  });

  it('returns a custom name for keyboard interactions', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
    const keydownInteraction = traceData.UserInteractions.interactionEvents.find(e => e.type === 'keydown');
    assert.isOk(keydownInteraction);
    const name = Components.EntryName.nameForEntry(keydownInteraction);
    assert.strictEqual(name, 'Keyboard');
  });

  it('returns "other" for unknown interaction event types', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
    // Copy the event so we do not modify the actual trace data, and fake its
    // interaction type to be unexpected.
    const firstInteraction = {...traceData.UserInteractions.interactionEvents[0]};
    firstInteraction.type = 'unknown';

    const name = Components.EntryName.nameForEntry(firstInteraction);
    assert.strictEqual(name, 'Other');
  });

  describe('profile calls', () => {
    it('uses the profile name for a ProfileCall if it has been set', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const {entry, profileNode} = getProfileEventAndNodeForReactTrace(traceData);
      // Store and then reset this: we are doing this to test the fallback to
      // the entry callFrame.functionName property. After the assertion we
      // reset this to avoid impacting other tests.
      const originalProfileNodeName = profileNode.functionName;
      profileNode.setFunctionName('testing-profile-name');
      const name = Components.EntryName.nameForEntry(entry, traceData);
      assert.strictEqual(name, 'testing-profile-name');
      profileNode.setFunctionName(originalProfileNodeName);
    });

    it('falls back to the call frame name if a specific name has not been set', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const {entry, profileNode} = getProfileEventAndNodeForReactTrace(traceData);
      // Store and then reset this: we are doing this to test the fallback to
      // the entry callFrame.functionName property. After the assertion we
      // reset this to avoid impacting other tests.
      const originalProfileNodeName = profileNode.functionName;
      profileNode.setFunctionName('');
      const name = Components.EntryName.nameForEntry(entry, traceData);
      assert.strictEqual(name, 'performConcurrentWorkOnRoot');
      profileNode.setFunctionName(originalProfileNodeName);
    });

    // Finds a particular event from the react-hello-world trace which is used for our test example.
    function getProfileEventAndNodeForReactTrace(traceData: TraceEngine.Handlers.Types.TraceParseData): {
      entry: TraceEngine.Types.TraceEvents.SyntheticProfileCall,
      profileNode: CPUProfile.ProfileTreeModel.ProfileNode,
    } {
      const mainThread = getMainThread(traceData.Renderer);
      let foundNode: CPUProfile.ProfileTreeModel.ProfileNode|null = null;
      let foundEntry: TraceEngine.Types.TraceEvents.SyntheticProfileCall|null = null;

      for (const entry of mainThread.entries) {
        if (TraceEngine.Types.TraceEvents.isProfileCall(entry) &&
            entry.callFrame.functionName === 'performConcurrentWorkOnRoot') {
          const profile = traceData.Samples.profilesInProcess.get(entry.pid)?.get(entry.tid);
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
