// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console.

import {getEnvVar} from './config.js';
import {WorkerMessage} from './worker-message.js';
import {cancelTest, initBrowser, runTest} from './worker-task.js';

const envVerbose = getEnvVar('VERBOSE');
function log(msg: string) {
  if (!envVerbose) {
    return;
  }

  console.log(`Worker (${process.pid}): ${msg}`);
}

function send(msg: WorkerMessage) {
  // Process.send only exists in workers, but TS doesn't know that we are in a worker
  // so we have to be overly cautious here.
  if (!process.send) {
    return;
  }

  process.send({
    pid: process.pid,
    details: msg,
  });
}

function requestTask() {
  send('requestTask');
}

let isSleeping = false;
async function onMessage(message: {ping?: boolean, task: string|null, port?: number}) {
  const {ping, task, port} = message;
  if (ping) {
    if (!isSleeping) {
      return;
    }

    log('Pinged. Waking.');
    isSleeping = false;
    process.nextTick(requestTask);
  }

  if (port) {
    log(`Initializing browser on port ${port}.`);
    await initBrowser(port);

    // Once booted, ask for a task.
    isSleeping = true;
    process.nextTick(requestTask);
    return;
  }

  if (!task) {
    log('Sleeping.');
    isSleeping = true;
    return;
  }

  isSleeping = false;
  log(`Running tests from ${task}`);
  const {code, output} = await runTest(task);

  // Force the cast in this case as an exception to the norm.
  send(output as WorkerMessage);

  if (code === 1) {
    send('failure');
  }

  process.nextTick(requestTask);
}

function interruptionHandler() {
  log('Shutting down - aborting tests.');
  cancelTest();
}

export function init() {
  process.on('message', onMessage);
  send('notifyInit');
}

process.on('SIGINT', interruptionHandler);
process.on('SIGTERM', interruptionHandler);
process.on('uncaughtException', interruptionHandler);
process.stdin.resume();
