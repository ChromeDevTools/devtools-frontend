// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const puppeteer = require('puppeteer-core');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

const DEFAULT_FOLLOW_UP_QUERY = 'Fix the issue using JavaScript code execution.';

const startTime = performance.now();
const numberFormatter = new Intl.NumberFormat('en-EN', {maximumSignificantDigits: 3});
const acquiredDevToolsTargets = new WeakMap();
function formatElapsedTime() {
  return `${numberFormatter.format((performance.now() - startTime) / 1000)}s`;
}

/* clang-format off */
const yargsObject = yargs
  .option('example-urls', {
    string: true,
    type: 'array',
    demandOption: true,
  })
  .option('parallel', {
    boolean: true,
    default: true,
  })
  .option('label', {
    string: true,
    default: 'run'
  })
  .option('include-follow-up', {
    boolean: true,
    default: false,
  })
  .argv;
/* clang-format on */

const OUTPUT_DIR = path.resolve(__dirname, 'data');
const {exampleUrls, label} = yargsObject;

class Logger {
  #logs = {};
  #updateElapsedTimeInterval = 0;
  constructor() {
    this.#updateElapsedTimeInterval = setInterval(() => {
      this.#updateElapsedTime();
    }, 1000);
  }

  #updateElapsedTime() {
    this.#logs['elapsedTime'] = {index: 999, text: `\nElapsed time: ${formatElapsedTime()}`};
    this.#flushLogs();
  }

  #flushLogs() {
    process.stdout.write('\x1Bc');
    const values = Object.values(this.#logs);
    const sortedValues = values.sort((val1, val2) => val1.index - val2.index);
    for (const {text} of sortedValues) {
      process.stdout.write(`${text}\n`);
    }
  }

  formatError(err) {
    return `${err.stack}${err.cause ? `\n${err.cause.stack}` : ''}`;
  }

  head(text) {
    this.log('head', -1, `${text}\n`);
  }

  log(id, index, text) {
    this.#updateElapsedTime();
    this.#logs[id] = {index, text};
    this.#flushLogs();
  }

  destroy() {
    clearInterval(this.#updateElapsedTimeInterval);
  }
}

class Example {
  #url;
  #browser;
  #ready;
  #page;
  #devtoolsPage;
  #queries;
  #explanation;
  constructor(url, browser) {
    this.#url = url;
    this.#browser = browser;
  }

  async #generateMetadata(page) {
    function splitComment(comment) {
      let isAnswer = false;
      const question = [];
      const answer = [];
      for (let line of comment.split('\n')) {
        line = line.trim();

        if (line.startsWith('#')) {
          isAnswer = true;
        }

        if (isAnswer) {
          if (line.startsWith('#')) {
            line = line.substring(1).trim();
          }
          answer.push(line);
        } else {
          question.push(line);
        }
      }
      return {
        answer: answer.join('\n'),
        question: question.join(' '),
      };
    }

    let comments = await page.evaluate(() => {
      function collectComments(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_COMMENT,
        );
        const results = [];
        while (walker.nextNode()) {
          const comment = walker.currentNode;
          results.push({
            comment: comment.textContent.trim(),
            commentElement: comment,
            targetElement: comment.nextElementSibling,
          });
        }
        return results;
      }
      const elementWalker = document.createTreeWalker(
          document.documentElement,
          NodeFilter.SHOW_ELEMENT,
      );
      const results = [...collectComments(document.documentElement)];
      while (elementWalker.nextNode()) {
        const el = elementWalker.currentNode;
        if ('shadowRoot' in el && el.shadowRoot) {
          results.push(...collectComments(el.shadowRoot));
        }
      }
      globalThis.__commentElements = results;
      return results.map(result => result.comment);
    });
    comments = comments.map(comment => splitComment(comment));
    // Only get the first comment for now.
    const comment = comments[0];
    const queries = [comment.question];
    if (yargsObject.includeFollowUp) {
      queries.push(DEFAULT_FOLLOW_UP_QUERY);
    }

    return {
      idx: 0,
      queries,
      explanation: comment.answer,
    };
  }

  id() {
    return this.#url.split('/').pop().replace('.html', '');
  }

  isReady() {
    return this.#ready;
  }

  async #prepare() {
    this.log('Creating a page');
    const page = await this.#browser.newPage();
    await page.goto(this.#url);
    this.log(`Navigated to ${this.#url}`);

    const devtoolsTarget = await this.#browser.waitForTarget(target => {
      const isAcquiredBefore = acquiredDevToolsTargets.has(target);
      return target.type() === 'other' && target.url().startsWith('devtools://') && !isAcquiredBefore;
    });
    acquiredDevToolsTargets.set(devtoolsTarget, true);

    const {idx, queries, explanation} = await this.#generateMetadata(page);
    this.log('[Info]: Running...');
    // Strip comments to prevent LLM from seeing it.
    await page.evaluate(() => {
      for (const {commentElement} of globalThis.__commentElements) {
        commentElement.remove();
      }
    });

    const devtoolsPage = await devtoolsTarget.asPage();
    this.log('[Info]: Got devtools page');

    await devtoolsPage.keyboard.press('Escape');
    await devtoolsPage.keyboard.press('Escape');
    await devtoolsPage.locator(':scope >>> #tab-elements').setTimeout(5000).click();
    this.log('[Info]: Opened Elements panel');

    await devtoolsPage.locator('aria/<body>').click();

    this.log('[Info]: Expanding all elements');
    let expand = await devtoolsPage.$$('pierce/.expand-button');
    while (expand.length) {
      for (const btn of expand) {
        await btn.click();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      expand = await devtoolsPage.$$('pierce/.expand-button');
    }

    this.log('[Info]: Locating console');
    await devtoolsPage.locator(':scope >>> #tab-console').click();
    await devtoolsPage.locator('aria/Console prompt').click();
    await devtoolsPage.keyboard.type(`inspect(globalThis.__commentElements[${idx}].targetElement)`);
    await devtoolsPage.keyboard.press('Enter');

    this.log('[Info]: Locating AI assistance tab');
    await devtoolsPage.locator(':scope >>> #tab-elements').click();
    await devtoolsPage.locator('aria/Customize and control DevTools').click();
    await devtoolsPage.locator('aria/More tools').click();
    await devtoolsPage.locator('aria/AI assistance').click();
    this.log('[Info]: Opened AI assistance tab');

    this.#page = page;
    this.#devtoolsPage = devtoolsPage;
    this.#queries = queries;
    this.#explanation = explanation;
  }

  async prepare() {
    this.log('Getting prepared');
    try {
      await this.#prepare();
      this.#ready = true;
    } catch (err) {
      this.#ready = false;
      this.error(`Preparation failed.\n${logger.formatError(err)}`);
    }
  }

  async execute() {
    const executionStartTime = performance.now();
    await this.#devtoolsPage.waitForFunction(() => {
      return 'setDebugFreestylerEnabled' in window;
    });

    await this.#devtoolsPage.evaluate(() => {
      setDebugFreestylerEnabled(true);
    });

    const results = [];
    const prompt = async query => {
      await this.#devtoolsPage.locator('aria/Ask a question about the selected element').click();

      await this.#devtoolsPage.locator('aria/Ask a question about the selected element').fill(query);

      this.#devtoolsPage.evaluate(() => {
        window.addEventListener('freestylersideeffect', ev => {
          ev.detail.confirm();
        });
      });

      const done = this.#devtoolsPage.evaluate(() => {
        return new Promise(resolve => {
          window.addEventListener('freestylerdone', () => {
            resolve();
          }, {
            once: true,
          });
        });
      });

      await this.#devtoolsPage.keyboard.press('Enter');
      await done;

      const result = JSON.parse(await this.#devtoolsPage.evaluate(() => {
        return localStorage.getItem('freestylerStructuredLog');
      }));

      return result.map(r => ({...r, exampleId: this.id()}));
    };

    for (const query of this.#queries) {
      this.log(`[Info]: Running the user prompt "${query}" (This step might take long time)`);
      const result = await prompt(query);
      results.push(...result);
    }

    await this.#page.close();
    const elapsedTime = numberFormatter.format((performance.now() - executionStartTime) / 1000);
    this.log(`Finished (${elapsedTime}s)`);
    return {results, metadata: {exampleId: this.id(), explanation: this.#explanation}};
  }

  log(text) {
    const indexOfExample = exampleUrls.indexOf(this.#url);
    logger.log(
        this.#url, indexOfExample,
        `\x1b[33m[${indexOfExample + 1}/${exampleUrls.length}] ${this.id()}:\x1b[0m ${text}`);
  }

  error(text) {
    const indexOfExample = exampleUrls.indexOf(this.#url);
    logger.log(
        this.#url, indexOfExample,
        `\x1b[33m[${indexOfExample + 1}/${exampleUrls.length}] ${this.id()}:\x1b[0m \x1b[31m${text}\x1b[0m`);
  }
}

const logger = new Logger();
async function runInParallel(examples) {
  logger.head('Preparing examples...');
  for (const example of examples) {
    await example.prepare();
  }

  logger.head('Running examples...');
  const allExampleResults = [];
  const metadata = [];
  await Promise.all(examples.filter(example => example.isReady()).map(async example => {
    try {
      const {results, metadata: singleMetadata} = await example.execute();
      allExampleResults.push(...results);
      metadata.push(singleMetadata);
    } catch (err) {
      example.error(`There is an error, skipping it.\n${logger.formatError(err)}`);
    }
  }));

  return {allExampleResults, metadata};
}

async function runSequentially(examples) {
  const allExampleResults = [];
  const metadata = [];
  logger.head('Running examples sequentially...');
  for (const example of examples) {
    await example.prepare();
    if (!example.isReady()) {
      continue;
    }

    try {
      const {results, metadata: singleMetadata} = await example.execute();
      allExampleResults.push(...results);
      metadata.push(singleMetadata);
    } catch (err) {
      example.error(`There is an error, skipping it.\n${logger.formatError(err)}`);
    }
  }

  return {allExampleResults, metadata};
}

async function main() {
  logger.head('Connecting to the browser...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
    targetFilter: target => {
      if (target.url().startsWith('chrome-extension://')) {
        return false;
      }
      return true;
    },
  });
  logger.head('Browser connection is ready...');

  // Close any non about:blank pages. There should be only one
  // about:blank page and DevTools should be closed manually for it.
  logger.head(
      'Getting browser pages... (If stuck in here, please close all the tabs in the connected Chrome manually.)');
  try {
    for (const page of await browser.pages()) {
      if (page.url() === 'about:blank') {
        continue;
      }
      await page.close();
    }
  } catch (err) {
    logger.head(`There was an error closing pages\n${err.stack}`);
  }

  logger.head('Preparing examples...');
  const examples = exampleUrls.map(exampleUrl => new Example(exampleUrl, browser));
  let allExampleResults = [];
  let metadata = [];
  if (yargsObject.parallel) {
    ({allExampleResults, metadata} = await runInParallel(examples));
  } else {
    ({allExampleResults, metadata} = await runSequentially(examples));
  }

  await browser.disconnect();

  const output = {
    metadata,
    examples: allExampleResults,
  };

  const dateSuffix = new Date().toISOString().slice(0, 19);
  const outputPath = path.resolve(OUTPUT_DIR, `${label}-${dateSuffix}.json`);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.info(`\n[Info]: Finished exporting results to ${outputPath}, it took ${formatElapsedTime()}`);
  logger.destroy();
}

main();
