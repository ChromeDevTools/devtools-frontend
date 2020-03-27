// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import * as cluster from 'cluster';
import {join} from 'path';

import {getEnvVar} from './config.js';
import {WorkerMessage} from './worker-message.js';

const envDebug = getEnvVar('DEBUG');

// Lock to one worker to avoid flakiness.
// TODO: unlock when it's clear why there are flakes.
const envJobs = getEnvVar('JOBS', envDebug ? 1 : 1);

const workerCount = envJobs;
const taskList: string[] = [];
const ports = new Map<cluster.Worker, number>();

export function purge() {
  taskList.length = 0;
}

export function killWorkers() {
  const workerNames = Object.keys(cluster.workers);
  for (const workerName of workerNames) {
    const worker = cluster.workers[workerName];
    if (!worker) {
      continue;
    }

    worker.process.kill('SIGTERM');
  }
}

export function enqueue(tasks: string[]) {
  for (const task of tasks) {
    taskList.push(task);
  }

  // Wake up the workers.
  const workerNames = Object.keys(cluster.workers);
  for (const workerName of workerNames) {
    const worker = cluster.workers[workerName];
    if (!worker) {
      continue;
    }

    worker.send({ping: true});
  }
}

let hostedModeServer: ChildProcessWithoutNullStreams;
let exitCode = 0;
let finishCount = 0;
export function init() {
  finishCount = workerCount;
  console.log(`Creating ${workerCount} worker${(workerCount === 1 ? '' : 's')}.`);

  // Silence the stdout of individual workers.
  cluster.settings.silent = true;

  for (let w = 0; w < workerCount; w++) {
    const worker = cluster.fork({silent: true});
    worker.on('message', onWorkerMessage);
    worker.on('exit', onWorkerDisconnect);

    // Pipe through all errors.
    if (worker.process.stderr) {
      worker.process.stderr.pipe(process.stderr);
    }

    ports.set(worker, 9222 + w);
  }

  console.log('Spawning hosted mode server');
  const serverScriptPath = join(__dirname, '..', '..', 'scripts', 'hosted_mode', 'server.js');
  const cwd = join(__dirname, '..', '..');
  const {execPath} = process;
  hostedModeServer = spawn(execPath, [serverScriptPath], {cwd});
  hostedModeServer.on('error', handleHostedModeError);
  hostedModeServer.stderr.on('data', handleHostedModeError);

  // Debug mode: write out server responses.
  if (envDebug) {
    hostedModeServer.stdout.on('data', (message: any) => {
      console.log(`Hosted mode server: ${message}`);
    });
  }
}

function handleHostedModeError(data: Error) {
  console.log(`Hosted mode server: ${data}`);
  interruptionHandler();
}

export function interruptionHandler() {
  exitCode = 1;
  shutdown();
}

function shutdown() {
  killWorkers();

  console.log('\n');
  console.log('Stopping hosted mode server');
  hostedModeServer.kill();

  console.log(`Exiting with status code ${exitCode}`);
  process.exit(exitCode);
}

function locateWorkerByPid(pid: number): cluster.Worker {
  const workerName = Object.keys(cluster.workers).find(key => {
    const worker = cluster.workers[key];
    if (!worker) {
      return;
    }

    return worker.process.pid === pid;
  });

  if (!workerName) {
    throw new Error(`Received message from pid ${pid}, but was unable to find a corresponding worker`);
  }

  return cluster.workers[workerName] as cluster.Worker;
}

const envVerbose = getEnvVar('VERBOSE');
function log(pid: number, msg: string, alwaysShow = false) {
  const showMessages = envVerbose || alwaysShow;
  if (!showMessages) {
    return;
  }

  console.log(`Worker (${pid}): ${msg}`);
}

function onWorkerMessage({pid, details}: {pid: number, details: WorkerMessage}) {
  const worker = locateWorkerByPid(pid);

  switch (details) {
    case 'requestTask': {
      const task = taskList.shift();
      if (!task) {
        log(pid, 'Finished');
        finishCount--;
        if (finishCount === 0 && !envDebug) {
          shutdown();
        }
        break;
      }

      log(pid, `Requested task, being given ${task}`);
      worker.send({
        type: 'task',
        task,
      });
      break;
    }

    case 'notifyInit': {
      log(pid, 'Ready - Sending port');
      worker.send({
        port: ports.get(worker),
      });
      break;
    }

    case 'failure': {
      log(pid, 'Failure');
      exitCode = 1;
      break;
    }

    // All other messages, e.g. pass/fail from tests.
    default: {
      console.log(details);
      break;
    }
  }
}

function onWorkerDisconnect(code: number, signal: NodeJS.Signals) {
  if (signal) {
    console.log('Worker killed by ' + signal);
  } else if (code) {
    console.log('Worker exited with code ' + code);
  } else {
    console.log('Worker exited successfully');
  }
}
