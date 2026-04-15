// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {platform} from '../../conductor/platform.js';
import {executionLineHighlighted, PAUSE_INDICATOR_SELECTOR} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function waitForMarkers(devToolsPage: DevToolsPage, selector: string, count: number): Promise<string[]> {
  const markers = await devToolsPage.waitForMany(selector, count);
  return await Promise.all(markers.map(e => e.evaluate(e => e.textContent)));
}

describe('Sources Tab', () => {
  it('highlights locations to continue to when holding Ctrl/Cmd while paused',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
<!DOCTYPE html>
<script>
function foo1() {
  return 10;
}

function foo2() {
  return {a:x => 2 * x};
}

async function bar1() {
  return 10;
}

async function bar2(x) {
  return 2 * x;
}

async function foo3() {
  debugger;
  var a = foo1() + foo1();
  var b = foo2();
  if (a) {
    a = b.a(a);
  }

  bar1().then((xxx, yyy) => console.log(xxx));
  bar1().then(     (xxx, yyy) => console.log(xxx));
  bar1().then(     (xxx, /*zzz*/ yyy /* xyz    */) => console.log(xxx));
  bar1().then   (     bar2    );
  bar1().then   (     console.log()    );
  bar1().then   (     console.log    );
  bar1().then(function(x) {
    console.log(x);
  });
  bar1().then(   async /* comment */  function(x) {
    console.log(x);
  });
  bar1().then(   async function(x) {
    console.log(x);
  });
  bar1().then(bar2.bind(null));
  bar1().then(() => bar2(5));
  bar1().then(async () => await bar2(5));
  bar1().then(async (x, y) => await bar2(x));
  setTimeout(bar1, 2000);
  a = await bar1();
  bar1().then((x,
                y) => console.log(x));
  bar1().then((
      x, y) => console.log(x));
  bar1().then(async (
      x, y) => console.log(x));
  bar1().then(
      async (x, y) => console.log(x));
  bar1().then(
      bar2);
  bar1().then((bar2));
  bar1().then(Promise.resolve());
  bar1().then(Promise.resolve(42).then(bar2));
  bar1().then((Promise.resolve()));

  var False = false;
  if (False)
    bar1().then(bar2);
  bar1().then(bar2);

  bar1().then(/* comment */ bar2.bind(null));

  let blob = new Blob([''], {type: 'application/javascript'});
  let worker = new Worker(URL.createObjectURL(blob));
  worker.postMessage('hello!');

  return 10;
}
</script>`);

       inspectedPage.evaluate('foo3()');
       await Promise.all([
         devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR),
         executionLineHighlighted(devToolsPage),
       ]);

       // Focus the editor by clicking the execution line
       await devToolsPage.click('.cm-executionLine');
       await devToolsPage.page.keyboard.down(platform === 'mac' ? 'Meta' : 'Control');

       const [continueToLocation, continueToLocationAsync] = await Promise.all([
         waitForMarkers(devToolsPage, '.cm-continueToLocation', 24),
         waitForMarkers(devToolsPage, '.cm-continueToLocation-async', 5),
       ]);

       assert.deepEqual(continueToLocation, [
         'foo1',
         'foo1',
         'foo2',
         'a',
         'bar1',
         'then',
         '(xxx, yyy)',
         'bar1',
         'then',
         '(xxx, yyy)',
         'bar1',
         'then',
         '(xxx, /*zzz*/ yyy /* xyz    */)',
         'bar1',
         'then',
         'bar2',
         'bar1',
         'then',
         'log',
         'bar1',
         'then',
         'bar1',
         'then',
         'function'
       ]);

       assert.deepEqual(
           continueToLocationAsync,
           ['(xxx, yyy)', '(xxx, yyy)', '(xxx, /*zzz*/ yyy /* xyz    */)', 'bar2', 'function']);
     });

  it('highlights locations to continue to when holding Ctrl/Cmd while paused in top-level code',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
<!DOCTYPE html>
<script>
function testFunction() {
  eval(\`
    debugger;
    foo1();
    Promise.resolve().then(foo2);
    Promise.resolve().then(() => 42);
    setTimeout(foo2);
    function foo1() {}
    function foo2() {}
  \`);
}
</script>`);

       inspectedPage.evaluate('testFunction()');
       await Promise.all([
         devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR),
         executionLineHighlighted(devToolsPage),
       ]);

       // Focus the editor by clicking the execution line
       await devToolsPage.click('.cm-executionLine');
       await devToolsPage.page.keyboard.down(platform === 'mac' ? 'Meta' : 'Control');

       const [continueToLocation, continueToLocationAsync] = await Promise.all([
         waitForMarkers(devToolsPage, '.cm-continueToLocation', 9),
         waitForMarkers(devToolsPage, '.cm-continueToLocation-async', 3),
       ]);

       assert.deepEqual(
           continueToLocation, ['foo1', 'resolve', 'then', 'foo2', 'resolve', 'then', '()', 'setTimeout', 'foo2']);

       assert.deepEqual(continueToLocationAsync, ['foo2', '()', 'foo2']);
     });
});
