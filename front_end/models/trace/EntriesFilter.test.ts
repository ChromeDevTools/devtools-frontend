// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2023222 The Chromium Author2s. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TraceEngine from '../trace/trace.js';

function getMainThread(data: TraceEngine.Handlers.ModelHandlers.Renderer.RendererHandlerData):
    TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread {
  let mainThread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
  for (const [, process] of data.processes) {
    for (const [, thread] of process.threads) {
      if (thread.name === 'CrRendererMain') {
        mainThread = thread;
        break;
      }
    }
  }
  if (!mainThread) {
    throw new Error('Could not find main thread.');
  }
  return mainThread;
}

function findFirstEntry(
    allEntries: readonly TraceEngine.Types.TraceEvents.SyntheticTraceEntry[],
    predicate: (entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry) =>
        boolean): TraceEngine.Types.TraceEvents.SyntheticTraceEntry {
  const entry = allEntries.find(entry => predicate(entry));
  if (!entry) {
    throw new Error('Could not find expected entry.');
  }
  return entry;
}

describe('EntriesFilter', function() {
  it('parses a stack and returns an empty list of invisible entries', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    assert.deepEqual([], stack.invisibleEntries());
  });

  it('supports the user merging an entry into its parent', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *                  ==== fibonacci ===
     *
     * In this test we want to test the user merging basicTwo into its parent, so the resulting trace should look like so:
     * ======== basicStackOne ============
     * =========== basicThree ============ << No more basicTwo, it has been merged.
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *                  ==== fibonacci ===
     *
     **/
    const entryTwo = findFirstEntry(mainThread.entries, entry => {
      // Processing this trace ends up with two distinct stacks for basicTwo()
      // So we find the first one so we can focus this test on just one stack.
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicTwo' &&
          entry.dur === 827;
    });
    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, entry: entryTwo});
    assert.isTrue(stack.invisibleEntries().includes(entryTwo), 'entryTwo is invisble');
    // Only one entry - the one for the `basicTwo` function - should have been hidden.
    assert.strictEqual(stack.invisibleEntries().length, 1);
  });

  it('adds the parent of the merged entry into the modifiedVisibleEntries array', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *
     * In this test we want to test that the parent of the merged entry is added to the modifiedVisibleEntries array,
     * so that later an array decoration is added to it and the merged entry could be shown again if the array is clicked.
     * the user merging basicTwo into its parent, so the resulting trace should look like so:
     * ======== basicStackOne ============ << As parent of basicTwo, it belongs to the modifiedVisibleEntries array
     * =========== basicThree ============ << No more basicTwo, it has been merged.
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *
     **/
    const entryTwo = findFirstEntry(mainThread.entries, entry => {
      // Processing this trace ends up with two distinct stacks for basicTwo()
      // So we find the first one so we can focus this test on just one stack.
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicTwo' &&
          entry.dur === 827;
    });
    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, entry: entryTwo});
    assert.isTrue(stack.invisibleEntries().includes(entryTwo), 'entryTwo is invisble');

    // Get the parent of basicTwo, which is basicStackOne.
    const basicStackOne = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicStackOne' &&
          entry.dur === 827;
    });
    // Get the parent of basicTwo marked as modified.
    assert.isTrue(stack.isEntryModified(basicStackOne));
  });

  it('adds the collapsed entry into the modifiedVisibleEntries array', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *
     * In this test we want to test that the collapsed entry is added to the modifiedVisibleEntries array,
     * so that later an arrow decoration is added to it and the collapsed entries could be shown again if the arraw is clicked.
     *
     * The user collapses basicTwo, so the resulting trace should look like so:
     * ======== basicStackOne ============
     * =========== basicTwo ============ << All entries under basicTwo merged collapsed and it belongs to the modifiedVisibleEntries array
     *
     **/
    const entryTwo = findFirstEntry(mainThread.entries, entry => {
      // Processing this trace ends up with two distinct stacks for basicTwo()
      // So we find the first one so we can focus this test on just one stack.
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicTwo' &&
          entry.dur === 827;
    });
    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_FUNCTION, entry: entryTwo});
    // basicTwo is marked as modified.
    assert.isTrue(stack.isEntryModified(entryTwo));
  });

  it('adds the next visible parent of the merged entry into the modifiedVisibleEntries array if the direct parent is hidden',
     async function() {
       const data = await TraceLoader.traceEngine(this, 'two-functions-recursion.json.gz');
       const mainThread = getMainThread(data.Renderer);
       /** This stack looks roughly like so (with some events omitted):
        * ======== onclick ============
        * =========== foo =============
        *               ==== foo2 =====
        *               ===== foo =====
        *               ==== foo2 =====
        *               ===== foo =====
        *               ==== foo2 =====
        *               ===== foo =====
        *
        * In this test we want to test that the next visible parent of the merged entry is added to the
        * modifiedVisibleEntries array even if the direct one is hidden by some other action,
        * so that later an array decoration is added to it and the merged entry could be shown again if the array is clicked.
        *
        * collapse all repeating calls of foo after the first one:
        * ======== onclick ============
        * =========== foo =============                  << all foo except first removed
        *               ===== foo2 ====
        *               ==== foo2 =====                  << direct parent is not visible anymore
        *               ==== foo2 =====
        *
        * merge second foo2 and add the next visible parent to the modifiedVisibleEntries array:
        * ======== onclick ============
        * =========== foo =============
        *               ===== foo2 ====                  << added to modifiedVisibleEntries as the next visible parent of the merged entry
        *               ==== foo2 =====
        *
        **/
       const firstFooCallEntry = findFirstEntry(mainThread.entries, entry => {
         return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo' &&
             entry.dur === 233;
       });
       const firstFooCallEndTime = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(firstFooCallEntry).endTime;
       const fooCalls = mainThread.entries.filter(entry => {
         const isFooCall = TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo';
         if (!isFooCall) {
           return false;
         }
         const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
         return endTime <= firstFooCallEndTime;
       });
       const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);

       // Collapse all foo calls after the first one.
       stack.applyFilterAction({
         type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_REPEATING_DESCENDANTS,
         entry: firstFooCallEntry,
       });

       // First foo call is marked as modified since its' children are hidden.
       assert.isTrue(stack.isEntryModified(firstFooCallEntry));

       // Make sure all foo calls after first are hidden.
       const allFooExceptFirstInStackAreHidden = fooCalls.every((fooCall, i) => {
         if (i === 0) {
           // First foo should not be invisible.
           return !stack.invisibleEntries().includes(fooCall);
         }
         return stack.invisibleEntries().includes(fooCall);
       });
       assert.isTrue(
           allFooExceptFirstInStackAreHidden, 'First foo is invisible or some following foo calls are still visible');

       const foo2Calls = mainThread.entries.filter(entry => {
         const isFoo2Call =
             TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo2';
         if (!isFoo2Call) {
           return false;
         }
         const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
         return endTime <= firstFooCallEndTime;
       });

       // Merge second foo2 entry.
       stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, entry: foo2Calls[1]});
       // First foo2 entry should be in the modifiedVisibleEntries array.
       assert.isTrue(stack.isEntryModified(foo2Calls[0]));
     });

  it('supports collapsing an entry', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *                  ==== fibonacci ===
     *
     * In this test we want to test the user collapsing basicTwo, which should have the effect of keeping basicTwo visible, but removing all of its children:
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     *                                    << all children removed
     **/
    const basicTwoCallEntry = findFirstEntry(mainThread.entries, entry => {
      // Processing this trace ends up with two distinct stacks for basicTwo()
      // So we find the first one so we can focus this test on just one stack.
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicTwo' &&
          entry.dur === 827;
    });

    // Gather the fib() calls under the first basicTwo stack, by finding all
    // the calls whose end time is less than or equal to the end time of the
    // `basicTwo` function.
    const fibonacciCalls = mainThread.entries.filter(entry => {
      const isFibCall =
          TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'fibonacci';
      if (!isFibCall) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      const basicTwoCallEndTime = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(basicTwoCallEntry).endTime;
      return endTime <= basicTwoCallEndTime;
    });
    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_FUNCTION, entry: basicTwoCallEntry});

    // We collapsed at the `basicTwo` entry - so it should not be included in the invisible list itself.
    assert.isFalse(stack.invisibleEntries().includes(basicTwoCallEntry), 'entryTwo is not visible');
    // But all fib() calls below it in the stack should now be invisible.
    const allFibonacciInStackAreHidden = fibonacciCalls.every(fibCall => {
      return stack.invisibleEntries().includes(fibCall);
    });
    assert.isTrue(allFibonacciInStackAreHidden, 'Some fibonacci calls are still visible');
  });

  it('supports collapsing all repeating entries among descendants', async function() {
    const data = await TraceLoader.traceEngine(this, 'two-functions-recursion.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== onclick ============
     * =========== foo =============
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *
     * In this test we want to test the user collapsing all descendant foo calls of the first first one,
     * which should have the effect of keeping the first foo visible, but removing all of its other calls:
     * ======== onclick ============
     * =========== foo =============
     *               ===== foo2 ====                  << all foo except first removed
     *               ==== foo2 =====
     *               ==== foo2 =====
     **/

    const firstFooCallEntry = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo' &&
          entry.dur === 233;
    });

    // Gather the foo() and foo2() calls under and including the first foo entry, by finding all
    // the calls whose end time is less than or equal to the end time of the first `foo` function.
    const firstFooCallEndTime = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(firstFooCallEntry).endTime;
    const fooCalls = mainThread.entries.filter(entry => {
      const isFooCall = TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo';
      if (!isFooCall) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      return endTime <= firstFooCallEndTime;
    });

    const foo2Calls = mainThread.entries.filter(entry => {
      const isFoo2Call = TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo2';
      if (!isFoo2Call) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      return endTime <= firstFooCallEndTime;
    });

    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction(
        {type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entry: firstFooCallEntry});

    // We collapsed identical descendants after the first `foo` entry - so it should not be included in the invisible list itself,
    // but all foo() calls below it in the stack should now be invisible.
    const allFooExceptFirstInStackAreHidden = fooCalls.every((fooCall, i) => {
      if (i === 0) {
        // First foo should not be invisible.
        return !stack.invisibleEntries().includes(fooCall);
      }
      return stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(
        allFooExceptFirstInStackAreHidden, 'First foo is invisible or some following foo calls are still visible');

    // All of the foo2 calls that were inbetween foo calls should still be visible.
    const allFoo2InStackAreVisible = foo2Calls.every(fooCall => {
      return !stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(allFoo2InStackAreVisible, 'Some foo2 calls are invisible');
  });

  it('supports undo all filter actions by applying context menu undo action', async function() {
    const data = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *              ======== fibonacci ===
     *                  ==== fibonacci ===
     *
     * In this test we want to test the user undoing all actions with 'undo all actions' after applying merge, collapse repeating descendants and collapse function.
     *
     * First, collapse all repeating descendants of the first fibonacci call:
     * ======== basicStackOne ============
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===                  << repeating children removed
     *
     * Then, merge basicStackOne:
     * =========== basicTwo ==============
     * =========== basicThree ============
     *              ======== fibonacci ===
     *
     * Finally, collapse basicTwo():
     * =========== basicTwo ==============
     *
     * Applying 'undo all actions' should bring the stack to the original state.
     **/

    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    const basicTwoCallEntry = findFirstEntry(mainThread.entries, entry => {
      // Processing this trace ends up with two distinct stacks for basicTwo()
      // So we find the first one so we can focus this test on just one stack.
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicTwo' &&
          entry.dur === 827;
    });
    const fibonacciCalls = mainThread.entries.filter(entry => {
      const isFibCall =
          TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'fibonacci';
      if (!isFibCall) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      const basicTwoCallEndTime = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(basicTwoCallEntry).endTime;
      return endTime <= basicTwoCallEndTime;
    });

    // Collapse all repeating descendants of the first fibonacci call:
    stack.applyFilterAction(
        {type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entry: fibonacciCalls[0]});
    // We collapsed identical descendants after the first `foo` entry - so it should not be included in the invisible list itself,
    // but all foo() calls below it in the stack should now be invisible.
    const allFibExceptFirstInStackAreHidden = fibonacciCalls.every((fibCall, i) => {
      if (i === 0) {
        // First foo should not be invisible.
        return !stack.invisibleEntries().includes(fibCall);
      }
      return stack.invisibleEntries().includes(fibCall);
    });
    assert.isTrue(
        allFibExceptFirstInStackAreHidden, 'First fib is invisible or some following fib calls are still visible');

    // Merge basicStackOne:
    const basicStackOne = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicStackOne' &&
          entry.dur === 827;
    });
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, entry: basicStackOne});
    assert.isTrue(stack.invisibleEntries().includes(basicStackOne), 'entrybasicStackOneTwo is visble');

    // Collapse basicTwo():
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_FUNCTION, entry: basicTwoCallEntry});
    // basicThree and first fibnacci should now be hidden:
    const basicThree = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'basicThree' &&
          entry.dur === 827;
    });
    assert.isTrue(stack.invisibleEntries().includes(basicThree), 'basicThree is visble');
    assert.isTrue(stack.invisibleEntries().includes(fibonacciCalls[0]), 'first fibonacci is visble');

    // Apply UNDO_ALL_ACTIONS to bring back all of the hidden entries:
    // UNDO_ALL_ACTIONS can be called on any visible entry
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.UNDO_ALL_ACTIONS, entry: basicTwoCallEntry});
    // If the length of invisibleEntries list is 0, all of the entries added earlier were removed and are now visible.
    assert.strictEqual(stack.invisibleEntries().length, 0);
  });

  it('supports resetting all hidden children of a selected entry', async function() {
    const data = await TraceLoader.traceEngine(this, 'two-functions-recursion.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some events omitted):
     * ======== onclick ============
     * =========== foo =============
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *
     * In this test we want to test the user collapsing all descendant foo calls of the first first one,
     * which should have the effect of keeping the first foo visible, but removing all of its other calls:
     * ======== onclick ============
     * =========== foo =============
     *               ===== foo2 ====                  << all foo except first removed
     *               ==== foo2 =====
     *               ==== foo2 =====
     *
     * Then, reset children on the second visible foo2.
     * ======== onclick ============
     * =========== foo =============
     *               ===== foo2 ====                  << foo() after this entry still hidden
     *               ==== foo2 =====                  << all children from this node are visible
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *
     * This results in a stack where all children of an entry children were reset on (second foo2)
     * are visible, but the entries hidden above the entry children were reset on stay hidden.
     **/

    const firstFooCallEntry = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo' &&
          entry.dur === 233;
    });

    // Gather the foo() and foo2() calls under and including the first foo entry, by finding all
    // the calls whose end time is less than or equal to the end time of the first `foo` function.
    const firstFooCallEndTime = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(firstFooCallEntry).endTime;
    const fooCalls = mainThread.entries.filter(entry => {
      const isFooCall = TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo';
      if (!isFooCall) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      return endTime <= firstFooCallEndTime;
    });

    const foo2Calls = mainThread.entries.filter(entry => {
      const isFoo2Call = TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo2';
      if (!isFoo2Call) {
        return false;
      }
      const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(entry);
      return endTime <= firstFooCallEndTime;
    });

    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);
    stack.applyFilterAction(
        {type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entry: firstFooCallEntry});

    // We collapsed identical descendants after the first `foo` entry - so it should not be included in the invisible list itself,
    // but all foo() calls below it in the stack should now be invisible.
    const allFooExceptFirstInStackAreHidden = fooCalls.every((fooCall, i) => {
      if (i === 0) {
        // First foo should not be invisible.
        return !stack.invisibleEntries().includes(fooCall);
      }
      return stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(
        allFooExceptFirstInStackAreHidden, 'First foo is invisible or some following foo calls are still visible');

    // All of the foo2 calls that were inbetween foo calls should still be visible.
    let allFoo2InStackAreVisible = foo2Calls.every(fooCall => {
      return !stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(allFoo2InStackAreVisible, 'Some foo2 calls are invisible');

    // Reset all children after second foo2 call
    assert.strictEqual(foo2Calls.length, 3);
    stack.applyFilterAction({type: TraceEngine.EntriesFilter.FilterAction.RESET_CHILDREN, entry: foo2Calls[1]});

    // All foo and foo2 calls except the second foo cll should now be visible
    allFoo2InStackAreVisible = foo2Calls.every(fooCall => {
      return !stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(allFoo2InStackAreVisible, 'Some foo2 calls are invisible');

    const allFooExceptSecondInStackAreVisible = fooCalls.every((fooCall, i) => {
      if (i === 1) {
        // Second foo should be invisible.
        return stack.invisibleEntries().includes(fooCall);
      }
      return !stack.invisibleEntries().includes(fooCall);
    });
    assert.isTrue(
        allFooExceptSecondInStackAreVisible,
        'Some foo calls except the second one are invisible or the second one is visible');
  });

  it('correctly returns the amount of hidden children of a node', async function() {
    const data = await TraceLoader.traceEngine(this, 'two-functions-recursion.json.gz');
    const mainThread = getMainThread(data.Renderer);
    /** This stack looks roughly like so (with some erlier events omitted):
     * ======== onclick ============
     * =========== foo =============
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *               ==== foo2 =====
     *               ===== foo =====
     *
     * In this test we want to test if the amount of hidden children returned is correct:
     * If we collapse repeating children on the first foo call, the 3 child foo calls should be removed.
     * Therefore, the amount of hidden children should be equal to 3.
     * ======== onclick ============
     * =========== foo =============                  << all foo except first hidden
     *               ===== foo2 ====
     *               ==== foo2 =====
     *               ==== foo2 =====
     **/

    const firstFooCallEntry = findFirstEntry(mainThread.entries, entry => {
      return TraceEngine.Types.TraceEvents.isProfileCall(entry) && entry.callFrame.functionName === 'foo' &&
          entry.dur === 233;
    });

    const stack = new TraceEngine.EntriesFilter.EntriesFilter(data.Renderer.entryToNode);

    // Before applying any action on a node, there should be no entries hidden under it
    assert.strictEqual(stack.findHiddenDescendantsAmount(firstFooCallEntry), 0);

    stack.applyFilterAction(
        {type: TraceEngine.EntriesFilter.FilterAction.COLLAPSE_REPEATING_DESCENDANTS, entry: firstFooCallEntry});

    // There should be 3 foo() entries hidden under the first foo call entry
    assert.strictEqual(stack.findHiddenDescendantsAmount(firstFooCallEntry), 3);
  });
});
