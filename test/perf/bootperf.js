// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const utils = require('./bootperf-utils');
const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const { runs, targetUrl, progress, port, chromeBinary, waitFor } = require('yargs')
    .option('runs', {
      alias: 'r',
      describe: 'The number of times to run',
      default: 5,
      type: 'number'
    })
    .option('target-url', {
      alias: 'u',
      describe: 'The target url to test against',
      default: 'https://www.google.com/'
    })
    .option('port', {
      alias: 'p',
      describe: 'The remote debugging port',
      default: 9222,
      type: 'number'
    })
    .option('chrome-binary', {
      alias: 'e',
      describe: 'The executable to launch',
      default: process.env['CHROME_BIN']
    })
    .option('wait-for', {
      alias: 'w',
      describe: 'The selector to wait for',
      default: '.elements'
    })
    .option('progress', {
      describe: 'Show progress',
      type: 'boolean',
      default: true
    })
    .version('1.0.0')
    .help()
    .argv;

if (!chromeBinary) {
  console.log('No Chromium binary path provided.');
  process.exit(1);
}

const times = [];
const pages = [];
let exitCode = 0;
async function runBootPerf () {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromeBinary,
      defaultViewport: {
        width: 1280,
        height: 720
      },
      args: ['--remote-debugging-port=9222']
    });

    // Load the target page.
    const srcPage = await browser.newPage();
    await srcPage.goto(targetUrl);
    pages.push(srcPage);

    // Now get the DevTools listings.
    const devtools = await browser.newPage();
    await devtools.goto(`http://localhost:${port}/json`);
    pages.push(devtools);

    // Find the appropriate item to inspect the target page.
    const listing = await devtools.$('pre');
    const json = await devtools.evaluate(listing => listing.textContent, listing);
    const targets = JSON.parse(json);
    const { id } = targets.find((target) => target.url === targetUrl);

    for (let i = 0; i < runs; i++) {
      if (progress) {
        printRunProgress(`Run ${i + 1} of ${runs}`);
      }

      const start = performance.now();

      // Connect to the DevTools frontend.
      const frontEnd = await browser.newPage();
      await frontEnd.goto(`http://localhost:8090/front_end/inspector.html?ws=localhost:${port}/devtools/page/${id}`);
      await frontEnd.waitForSelector(waitFor);

      const duration = performance.now() - start;
      times.push(duration);

      // Close the page.
      frontEnd.close();
    }
  } catch (err) {
    console.warn(err);
    console.log(json);
    exitCode = 1;
  } finally {
    // Shut down.
    for (const page of pages) {
      try {
        await page.close();
      } catch (err) {
        console.warn('Catastrophic failure: unable to close pages');
        exitCode = 1;
      }
    }

    console.log(`Runs: ${times.length}`);

    if (times.length) {
      // Clear the output before showing the final figures.
      if (progress) {
        printRunProgress();
      }

      console.log(`Mean boot time: ${utils.mean(times).toFixed(2)}ms`);
      console.log(`50th percentile boot time: ${utils.percentile(times, 0.5).toFixed(2)}ms`);
      console.log(`90th percentile boot time: ${utils.percentile(times, 0.9).toFixed(2)}ms`);
      console.log(`99th percentile boot time: ${utils.percentile(times, 0.99).toFixed(2)}ms`);
    }
    process.exit(exitCode);
  }
}

function printRunProgress(msg = '') {
  if (!process || !('stdout' in process)) {
    return;
  }

  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(msg);
}

runBootPerf()
