// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertSelectedNodeClasses,
  toggleClassesPane,
  toggleClassesPaneCheckbox,
  typeInClassesPaneInput,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Classes pane', () => {
  it('can add a class to the element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);
    await devToolsPage.raf();

    await typeInClassesPaneInput('foo', devToolsPage);
    await assertSelectedNodeClasses(['foo'], devToolsPage);
  });

  it('can add multiple classes at once', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);
    await devToolsPage.raf();

    await typeInClassesPaneInput('foo bar', devToolsPage);
    await assertSelectedNodeClasses(['foo', 'bar'], devToolsPage);
  });

  it('can toggle classes', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);
    await devToolsPage.raf();

    await typeInClassesPaneInput('on off', devToolsPage);
    await assertSelectedNodeClasses(['on', 'off'], devToolsPage);

    await toggleClassesPaneCheckbox('off', devToolsPage);
    await assertSelectedNodeClasses(['on'], devToolsPage);

    await toggleClassesPaneCheckbox('off', devToolsPage);
    await toggleClassesPaneCheckbox('on', devToolsPage);
    await assertSelectedNodeClasses(['off'], devToolsPage);
  });

  it('removes the previewed classes on ESC', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await toggleClassesPane(devToolsPage);
    await devToolsPage.raf();

    await typeInClassesPaneInput('foo', devToolsPage);
    await typeInClassesPaneInput('bar', devToolsPage, 'Escape', false);
    await typeInClassesPaneInput('baz', devToolsPage);

    await assertSelectedNodeClasses(['foo', 'baz'], devToolsPage);
  });
});
