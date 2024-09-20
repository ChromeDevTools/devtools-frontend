// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

/**
 * There are two metadata events that we care about.
 * => AuctionWorkletRunningInProcess tells us which process the Auction Worklet
 *    has taken to run in.
 * => AuctionWorkletDoneWithProcess tells us when the worklet is done with that
 *    process. This is less useful - but in the future we might want to surface
 *    this information so we still parse and return the event.
 *
 * It is important to note that the top level PID on these events is NOT the
 * PID that the worklet is running on; instead we have to look at its
 * args.data.pid property, which is the PID of the process that it is running
 * on.
 *
 * For any given RunningInProcess event, we would typically expect to see a
 * DoneWithProcess event, however this is not guaranteed, especially as users
 * can record any chunk of time in DevTools.
 *
 * Similarly, it is also possible to see a DoneWithProcess event without a
 * RunningInProcess event, if the user started recording after the auction
 * worklets started. Therefore we are happy to create
 * SyntheticAuctionWorklets as long as we see just one of these events.
 *
 * If we do get two events and need to pair them, we can use the
 * args.data.target property, which is a string ID shared by both
 * events.
 */
const runningInProcessEvents: Map<Types.Events.ProcessID, Types.Events.AuctionWorkletRunningInProcess> = new Map();
const doneWithProcessEvents: Map<Types.Events.ProcessID, Types.Events.AuctionWorkletDoneWithProcess> = new Map();

// Keyed by the PID defined in  `args.data.pid` on AuctionWorklet trace events..
const createdSyntheticEvents: Map<Types.Events.ProcessID, Types.Events.SyntheticAuctionWorklet> = new Map();

// Each AuctonWorklet takes over a process and has 2 threads (that we care
// about and want to show as tracks):
// 1. A CrUtilityMain thread which is known as the "control process".
// 2. A AuctionV8HelperThread which is the actual auction worklet and will be
//    either a "Seller" or a "Bidder"
// To detect these we look for the metadata thread_name events. We key these by
// PID so that we can easily look them up later without having to loop through.
const utilityThreads: Map<Types.Events.ProcessID, Types.Events.ThreadName> = new Map();
const v8HelperThreads: Map<Types.Events.ProcessID, Types.Events.ThreadName> = new Map();

export function reset(): void {
  runningInProcessEvents.clear();
  doneWithProcessEvents.clear();
  createdSyntheticEvents.clear();
  utilityThreads.clear();
  v8HelperThreads.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isAuctionWorkletRunningInProcess(event)) {
    runningInProcessEvents.set(event.args.data.pid, event);
    return;
  }

  if (Types.Events.isAuctionWorkletDoneWithProcess(event)) {
    doneWithProcessEvents.set(event.args.data.pid, event);
    return;
  }

  if (Types.Events.isThreadName(event)) {
    if (event.args.name === 'auction_worklet.CrUtilityMain') {
      utilityThreads.set(event.pid, event);
      return;
    }
    if (event.args.name === 'AuctionV8HelperThread') {
      v8HelperThreads.set(event.pid, event);
    }
  }
}

function workletType(input: string): Types.Events.AuctionWorkletType {
  switch (input) {
    case 'seller':
      return Types.Events.AuctionWorkletType.SELLER;
    case 'bidder':
      return Types.Events.AuctionWorkletType.BIDDER;
    default:
      return Types.Events.AuctionWorkletType.UNKNOWN;
  }
}

/**
 * We cannot make the full event without knowing the type of event, but we can
 * create everything other than the `args` field, as those are identical
 * regardless of the type of event.
 */
function makeSyntheticEventBase(event: Types.Events.AuctionWorkletDoneWithProcess|
                                Types.Events.AuctionWorkletRunningInProcess):
    Omit<Types.Events.SyntheticAuctionWorklet, 'args'> {
  return Helpers.SyntheticEvents.SyntheticEventsManager
      .registerSyntheticEvent<Omit<Types.Events.SyntheticAuctionWorklet, 'args'>>({
        rawSourceEvent: event,
        name: 'SyntheticAuctionWorklet',
        s: Types.Events.Scope.THREAD,
        cat: event.cat,
        tid: event.tid,
        ts: event.ts,
        ph: Types.Events.Phase.INSTANT,
        pid: event.args.data.pid,
        host: event.args.data.host,
        target: event.args.data.target,
        type: workletType(event.args.data.type),
      });
}

export async function finalize(): Promise<void> {
  // Loop through the utility threads we found to create the worklet events. We
  // expect each worklet to have a utility thread, so we can use them as the
  // root of our list of worklets.
  for (const [pid, utilityThreadNameEvent] of utilityThreads) {
    const v8HelperEvent = v8HelperThreads.get(pid);
    if (!v8HelperEvent) {
      // Bad trace data - AuctionWorklets are expected to always have both threads.
      continue;
    }

    const runningEvent = runningInProcessEvents.get(pid);
    const doneWithEvent = doneWithProcessEvents.get(pid);

    // We can create a worklet from either the runningEvent or doneWithEvent -
    // we do not need both. We cannot express that to TypeScript with an early
    // return here, so instead we set the event initially to null, and then
    // create it from either the running event or the doneWith event. If it is
    // still null after this, that means neither event was found, and we drop
    // the worklet as we do not have enough information to create the synthetic
    // event.

    let syntheticEvent: Types.Events.SyntheticAuctionWorklet|null = null;

    if (runningEvent) {
      syntheticEvent = {
        ...makeSyntheticEventBase(runningEvent),
        args: {
          data: {
            runningInProcessEvent: runningEvent,
            utilityThread: utilityThreadNameEvent,
            v8HelperThread: v8HelperEvent,
          },
        },
      };
      if (doneWithEvent) {
        syntheticEvent.args.data.doneWithProcessEvent = doneWithEvent;
      }
    } else if (doneWithEvent) {
      syntheticEvent = {
        ...makeSyntheticEventBase(doneWithEvent),
        args: {
          data: {
            doneWithProcessEvent: doneWithEvent,
            utilityThread: utilityThreadNameEvent,
            v8HelperThread: v8HelperEvent,
          },
        },
      };
      if (runningEvent) {
        syntheticEvent.args.data.runningInProcessEvent = runningEvent;
      }
    }
    if (syntheticEvent === null) {
      continue;
    }
    createdSyntheticEvents.set(pid, syntheticEvent);
  }
}

export interface AuctionWorkletsData {
  worklets: Map<Types.Events.ProcessID, Types.Events.SyntheticAuctionWorklet>;
}

export function data(): AuctionWorkletsData {
  return {
    worklets: new Map(createdSyntheticEvents),
  };
}
