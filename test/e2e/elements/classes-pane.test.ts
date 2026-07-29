// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertSelectedNodeClasses,
  toggleClassesPane,
  toggleClassesPaneCheckbox,
  typeInClassesPaneInput,
} from '../helpers/elements-helpers.js';

describe('The Classes pane', () => {
  it('can add a class to the element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);

    await typeInClassesPaneInput(devToolsPage, 'foo');
    await assertSelectedNodeClasses(devToolsPage, ['foo']);
  });

  it('can add multiple classes at once', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);

    await typeInClassesPaneInput(devToolsPage, 'foo bar');
    await assertSelectedNodeClasses(devToolsPage, ['foo', 'bar']);
  });

  it('can toggle classes', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);

    await typeInClassesPaneInput(devToolsPage, 'on off');
    await assertSelectedNodeClasses(devToolsPage, ['on', 'off']);

    await toggleClassesPaneCheckbox(devToolsPage, 'off');
    await assertSelectedNodeClasses(devToolsPage, ['on']);

    await toggleClassesPaneCheckbox(devToolsPage, 'off');
    await assertSelectedNodeClasses(devToolsPage, ['on', 'off']);
    await toggleClassesPaneCheckbox(devToolsPage, 'on');
    await assertSelectedNodeClasses(devToolsPage, ['off']);
  });

  it('removes the previewed classes on ESC', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);

    await typeInClassesPaneInput(devToolsPage, 'foo');
    await typeInClassesPaneInput(devToolsPage, 'bar', 'Escape', false);
    await typeInClassesPaneInput(devToolsPage, 'baz');

    await assertSelectedNodeClasses(devToolsPage, ['foo', 'baz']);
  });
});
