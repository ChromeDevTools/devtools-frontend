// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

type AsyncActivity = {
  cancelDelayed?: () => void,
  id?: string,
  runImmediate?: () => void,
  stack?: string,
  promise?: Promise<unknown>, pending: boolean,
};

const asyncActivity: AsyncActivity[] = [];

export function startTrackingAsyncActivity() {
  // We are tracking all asynchronous activity but let it run normally during
  // the test.
  stub('requestAnimationFrame', trackingRequestAnimationFrame);
  stub('setTimeout', trackingSetTimeout);
  stub('setInterval', trackingSetInterval);
  stub('requestIdleCallback', trackingRequestIdleCallback);
  stub('cancelAnimationFrame', id => cancelTrackingActivity('a' + id));
  stub('clearTimeout', id => cancelTrackingActivity('t' + id));
  stub('clearInterval', id => cancelTrackingActivity('i' + id));
  stub('cancelIdleCallback', id => cancelTrackingActivity('d' + id));
  stub('Promise', TrackingPromise);
}

export async function checkForPendingActivity() {
  let stillPending: AsyncActivity[] = [];
  const wait = 5;
  let retries = 20;
  // We will perform multiple iteration of waiting and forced completions to see
  // if all promises are eventually resolved.
  while (retries > 0) {
    const pendingCount = asyncActivity.filter(a => a.pending).length;
    const totalCount = asyncActivity.length;
    try {
      // First we wait for the pending async activity to finish normally
      await original(Promise).all(asyncActivity.filter(a => a.pending).map(a => original(Promise).race([
        a.promise,
        new (original(Promise))(
            (_, reject) => original(setTimeout)(
                () => {
                  if (!a.pending) {
                    return;
                  }
                  // If something is still pending after some time, we try to
                  // force the completion by running timeout and animation frame
                  // handlers
                  if (a.cancelDelayed && a.runImmediate) {
                    a.cancelDelayed();
                    a.runImmediate();
                  } else {
                    reject();
                  }
                },
                wait)),
      ])));

      // If the above didn't throw, all the original pending activity has
      // completed, but it could have triggered more
      stillPending = asyncActivity.filter(a => a.pending);
      if (!stillPending.length) {
        break;
      }
      --retries;
    } catch (e) {
      stillPending = asyncActivity.filter(a => a.pending);
      const newTotalCount = asyncActivity.length;
      // Something is still pending. It might get resolved by force completion
      // of new activity added during the iteration, so let's retry a couple of
      // times.
      if (newTotalCount === totalCount && stillPending.length === pendingCount) {
        --retries;
      }
    }
  }
  if (stillPending.length) {
    throw new Error(
        'The test has completed, but there are still pending promises, created at: \n' +
        stillPending.map(a => a.stack).join('\n\n'));
  }
}

export function stopTrackingAsyncActivity() {
  asyncActivity.length = 0;
  restoreAll();
}

function trackingRequestAnimationFrame(fn: FrameRequestCallback) {
  const activity: AsyncActivity = {pending: true};
  let id = 0;
  activity.promise = new (original(Promise<void>))(resolve => {
    activity.runImmediate = () => {
      fn(performance.now());
      activity.pending = false;
      resolve();
    };
    id = original(requestAnimationFrame)(activity.runImmediate);
    activity.id = 'a' + id;
    activity.cancelDelayed = () => {
      original(cancelAnimationFrame)(id);
      activity.pending = false;
      resolve();
    };
  });
  asyncActivity.push(activity);
  return id;
}

function trackingRequestIdleCallback(fn: IdleRequestCallback, opts?: IdleRequestOptions): number {
  const activity: AsyncActivity = {pending: true};
  let id = 0;
  activity.promise = new (original(Promise<void>))(resolve => {
    activity.runImmediate = (idleDeadline?: IdleDeadline) => {
      fn(idleDeadline ?? {didTimeout: true, timeRemaining: () => 0} as IdleDeadline);
      activity.pending = false;
      resolve();
    };
    id = original(requestIdleCallback)(activity.runImmediate, opts);
    activity.id = 'd' + id;
    activity.cancelDelayed = () => {
      original(cancelIdleCallback)(id);
      activity.pending = false;
      resolve();
    };
  });
  asyncActivity.push(activity);
  return id;
}

function trackingSetTimeout(arg: TimerHandler, time?: number, ...params: unknown[]) {
  const activity: AsyncActivity = {
    pending: true,
  };
  let id = 0;
  activity.promise = new (original(Promise<void>))(resolve => {
    activity.runImmediate = () => {
      if (typeof (arg) === 'function') {
        arg(...params);
      } else {
        eval(arg);
      }
      activity.pending = false;
      resolve();
    };
    id = original(setTimeout)(activity.runImmediate, time);
    activity.id = 't' + id;
    activity.cancelDelayed = () => {
      original(clearTimeout)(id);
      activity.pending = false;
      resolve();
    };
  });
  asyncActivity.push(activity);
  return id;
}

function trackingSetInterval(arg: TimerHandler, time?: number, ...params: unknown[]) {
  const activity: AsyncActivity = {
    pending: true,
  };
  let id = 0;
  activity.promise = new (original(Promise<void>))(resolve => {
    id = original(setInterval)(arg, time, ...params);
    activity.id = 'i' + id;
    activity.cancelDelayed = () => {
      original(clearInterval)(id);
      activity.pending = false;
      resolve();
    };
  });
  asyncActivity.push(activity);
  return id;
}

function cancelTrackingActivity(id: string) {
  const activity = asyncActivity.find(a => a.id === id);
  if (activity?.cancelDelayed) {
    activity.cancelDelayed();
  }
}

// We can't subclass native Promise here as this will cause all derived promises
// (e.g. those returned by `then`) to also be subclass instances. This results
// in a new asyncActivity entry on each iteration of checkForPendingActivity
// which never settles.
const TrackingPromise: PromiseConstructor = Object.assign(
    function<T>(arg: (resolve: (value: T|PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
      const originalPromiseType = original(Promise);
      const promise = new (originalPromiseType)(arg);
      const activity: AsyncActivity = {
        promise,
        stack: getStack(new Error()),
        pending: false,
      };
      promise.then = function<TResult1 = T, TResult2 = never>(
          onFullfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>)|undefined|null,
          onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>)|undefined|
          null): Promise<TResult1|TResult2> {
        activity.pending = true;
        return originalPromiseType.prototype.then.apply(this, [
          result => {
            if (!onFullfilled) {
              return this;
            }
            activity.pending = false;
            return onFullfilled(result);
          },
          result => {
            if (!onRejected) {
              return this;
            }
            activity.pending = false;
            return onRejected(result);
          },
        ]) as Promise<TResult1|TResult2>;
      };

      asyncActivity.push(activity);
      return promise;
    },
    {
      all: Promise.all,
      allSettled: Promise.allSettled,
      any: Promise.any,
      race: Promise.race,
      reject: Promise.reject,
      resolve: Promise.resolve,
    } as PromiseConstructor);

function getStack(error: Error): string {
  return (error.stack ?? 'No stack').split('\n').slice(2).join('\n');
}

// We can't use Sinon for stubbing as 1) we need to double wrap somtimes and 2)
// we need to access original values.
type Stub<TKey extends keyof typeof window> = {
  name: TKey,
  original: (typeof window)[TKey],
  stubWith: (typeof window)[TKey],
};

const stubs: Stub<keyof typeof window>[] = [];

function stub<T extends keyof typeof window>(name: T, stubWith: (typeof window)[T]) {
  const original = window[name];
  window[name] = stubWith;
  stubs.push({name, original, stubWith});
}

function original<T>(stubWith: T): T {
  return stubs.find(s => s.stubWith === stubWith)?.original;
}

function restoreAll() {
  for (const {name, original} of stubs) {
    (window[name] as typeof original) = original;
  }
  stubs.length = 0;
}
