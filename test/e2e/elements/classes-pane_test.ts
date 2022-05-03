// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {beforeEach} from 'mocha';

import {goToResource, timeout} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  assertSelectedNodeClasses,
  toggleClassesPane,
  toggleClassesPaneCheckbox,
  typeInClassesPaneInput,
} from '../helpers/elements-helpers.js';

describe('The Classes pane', async () => {
  beforeEach(async function() {
    await goToResource('elements/simple-styled-page.html');
    await toggleClassesPane();
  });

  it('can add a class to the element', async () => {
    await typeInClassesPaneInput('foo');
    await assertSelectedNodeClasses(['foo']);
  });

  it('can add multiple classes at once', async () => {
    await typeInClassesPaneInput('foo bar');
    await assertSelectedNodeClasses(['foo', 'bar']);
  });

  it('can toggle classes', async () => {
    await typeInClassesPaneInput('on off');
    await assertSelectedNodeClasses(['on', 'off']);

    await toggleClassesPaneCheckbox('off');
    await assertSelectedNodeClasses(['on']);

    await toggleClassesPaneCheckbox('off');
    await toggleClassesPaneCheckbox('on');
    await assertSelectedNodeClasses(['off']);
  });

  it('removes the previewed classes on ESC', async () => {
    // Allow win64 bot to settle.
    await timeout(200);
    await typeInClassesPaneInput('foo');
    await typeInClassesPaneInput('bar', 'Escape', false);
    await typeInClassesPaneInput('baz');

    await assertSelectedNodeClasses(['foo', 'baz']);
  });
});
