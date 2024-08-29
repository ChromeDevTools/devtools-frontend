// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const puppeteer = require('puppeteer-core');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

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
    question: question.join('\n'),
  };
}

const DEFAULT_FOLLOW_UP_QUERY = 'Fix the issue using JavaScript code execution.';

const yargsObject = yargs
                        .option('example-urls', {
                          string: true,
                          type: 'array',
                          demandOption: true,
                        })
                        .argv;

const OUTPUT_DIR = path.resolve(__dirname, 'data');
const {exampleUrls} = yargsObject;

async function main() {
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

  async function runExample({url}) {
    async function generateMetadata(page) {
      let comments = await page.evaluate(() => {
        const walker = document.createTreeWalker(
            document.documentElement,
            NodeFilter.SHOW_COMMENT,
        );
        const results = [];
        const getSelector = el => {
          if (!el) {
            return undefined;
          }
          if (!(el instanceof Element)) {
            return undefined;
          }
          if (el.id) {
            return `#${el.id}`;
          }
          if (el.classList) {
            const classes = [];
            for (const cls of el.classList) {
              classes.push(`.${cls}`);
            }
            if (classes.length) {
              return classes.join('');
            }
          }
          return el.tagName.toLowerCase();
        };
        while (walker.nextNode()) {
          const comment = walker.currentNode;
          results.push({
            comment: comment.textContent.trim(),
            el: getSelector(comment.nextElementSibling),
          });
        }
        return results;
      });
      comments = comments.map(comment => {
        return {...comment, comment: splitComment(comment.comment)};
      });

      // Only get the first comment for now.
      const {comment, el} = comments[0];
      const id = url.split('/').pop().replace('.html', '');
      return {
        id,
        selector: el,
        queries: [comment.question, DEFAULT_FOLLOW_UP_QUERY],
        explanation: comment.answer,
      };
    }

    // Close any non about:blank pages. There should be only one
    // about:blank page and DevTools should be closed manually for it.
    for (const page of await browser.pages()) {
      if (page.url() === 'about:blank') {
        continue;
      }
      await page.close();
    }

    const page = await browser.newPage();

    await page.goto(url);

    const {id, selector, queries, explanation} = await generateMetadata(page);

    // Strip comments to prevent LLM from seeing it.«
    await page.evaluate(() => {
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
      while (walker.nextNode()) {
        walker.currentNode.remove();
      }
    });

    console.log('    [Action Required]: Waiting for devtools. Open DevTools now.');

    const devtoolsTarget =
        await browser.waitForTarget(target => target.type() === 'other' && target.url().startsWith('devtools://'));

    console.info('    [Info]: Got devtools target');

    const devtoolsPage = await devtoolsTarget.asPage();

    await devtoolsPage.keyboard.press('Escape');
    await devtoolsPage.keyboard.press('Escape');
    await devtoolsPage.locator(':scope >>> #tab-elements').click();

    console.info('    [Info]: Got devtools page');

    await devtoolsPage.locator('aria/<body>').click();

    console.info('    [Info]: Expanding all elements');
    let expand = await devtoolsPage.$$('pierce/.expand-button');
    while (expand.length) {
      for (const btn of expand) {
        await btn.click();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      expand = await devtoolsPage.$$('pierce/.expand-button');
    }

    console.info('    [Info]: Locating console');
    await devtoolsPage.locator(':scope >>> #tab-console').click();
    await devtoolsPage.locator('aria/Console prompt').click();
    await devtoolsPage.keyboard.type(`inspect(document.querySelector('${selector}'))`);
    await devtoolsPage.keyboard.press('Enter');

    console.info('    [Info]: Locating AI assistant tab');
    await devtoolsPage.locator(':scope >>> #tab-elements').click();
    await devtoolsPage.locator('aria/Customise and control DevTools').click();
    await devtoolsPage.locator('aria/More tools').click();
    await devtoolsPage.locator('aria/AI assistant').click();

    await devtoolsPage.waitForFunction(() => {
      return 'setDebugFreestylerEnabled' in window;
    });

    console.log('    [Info]: Enabled freestyler logs');
    await devtoolsPage.evaluate(() => {
      setDebugFreestylerEnabled(true);
    });

    const results = [];
    async function prompt(query) {
      await devtoolsPage.locator('aria/Ask a question about the selected element').click();

      await devtoolsPage.locator('aria/Ask a question about the selected element').fill(query);

      const done = devtoolsPage.evaluate(() => {
        return new Promise(resolve => {
          window.addEventListener('freestylerdone', () => {
            resolve();
          }, {
            once: true,
          });
        });
      });

      await devtoolsPage.keyboard.press('Enter');

      const abort = new AbortController();

      async function autoAcceptEvals(signal) {
        while (!signal.abort) {
          await devtoolsPage.locator('aria/Execute').click({signal});
        }
      }

      autoAcceptEvals(abort.signal).catch(() => {});

      await done;

      abort.abort();

      const result = JSON.parse(await devtoolsPage.evaluate(() => {
        return localStorage.getItem('freestylerStructuredLog');
      }));

      return result.map(r => ({...r, exampleId: id}));
    }

    for (const query of queries) {
      console.log(`    [Info]: Running the user prompt "${query}" (This step might take long time)`);
      const result = await prompt(query);
      results.push(...result);
    }

    await page.close();
    return {results, metadata: {exampleId: id, explanation}};
  }

  const allExampleResults = [];
  const metadata = [];
  for (let i = 0; i < exampleUrls.length; i++) {
    const exampleUrl = exampleUrls[i];
    console.log(`\n\x1b[33m[Info]: Running example ${exampleUrl} [${i + 1}/${exampleUrls.length}] \x1b[0m`);
    const {results, metadata: singleMetadata} = await runExample({url: exampleUrl});
    allExampleResults.push(...results);
    metadata.push(singleMetadata);
  }

  await browser.disconnect();

  const output = {
    metadata,
    examples: allExampleResults,
  };

  const dateSuffix = new Date().toISOString().slice(0, 19);
  const outputPath = path.resolve(OUTPUT_DIR, `out-${dateSuffix}.json`);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.info(`\n[Info]: Finished exporting results to ${outputPath}`);
}

main();
