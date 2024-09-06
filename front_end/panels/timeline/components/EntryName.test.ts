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
