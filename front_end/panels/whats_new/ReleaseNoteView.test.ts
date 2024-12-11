// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as WhatsNew from './whats_new.js';

const CONTENT1 = 'Something something topic-1.\n';
const CONTENT2 = 'Something something topic-2.\n';

describeWithEnvironment('Release Note View', () => {
  before(() => {
    WhatsNew.ReleaseNoteText.setReleaseNoteForTest(
        {
          version: 99,
          header: 'What\'s new in DevTools 100',
          markdownLinks: [
            {
              key: 'topic-1',
              link: 'https://google.com.com/#topic-1',
            },
          ],
          link: 'https://google.com',
        },
    );
  });

  it('splits up markdown file content into separate sections', async () => {
    const h1 = '### [Topic 1](topic-1)\n';
    const h2 = '### [Topic 2](topic-2)\n';

    const content = [h1, CONTENT1, h2, CONTENT2];
    const notes = content.join('');

    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(notes));
    const splitContent = await WhatsNew.ReleaseNoteView.getMarkdownContent();
    assert.lengthOf(splitContent, 2);

    for (let i = 0; i < 2; ++i) {
      assert.lengthOf(splitContent[i], 2);
      assert.deepStrictEqual(splitContent[i][0].type, 'heading');
      assert.deepStrictEqual(splitContent[i][1].type, 'paragraph');
      assert.deepStrictEqual(splitContent[i][0].raw, content[i * 2]);
      assert.deepStrictEqual(splitContent[i][1].raw, content[i * 2 + 1]);
    }
  });

  it('groups nested markdown headers into one', async () => {
    const h1 = '### [Topic 1](topic-1)\n';
    const h2 = '#### [Topic 2](topic-2)\n';

    const content = [h1, CONTENT1, h2, CONTENT2];
    const notes = content.join('');

    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(notes));
    const splitContent = await WhatsNew.ReleaseNoteView.getMarkdownContent();
    assert.lengthOf(splitContent, 1);
    assert.lengthOf(splitContent[0], 4);

    assert.deepStrictEqual(splitContent[0][0].raw, h1);
    assert.deepStrictEqual(splitContent[0][1].raw, CONTENT1);
    assert.deepStrictEqual(splitContent[0][2].raw, h2);
    assert.deepStrictEqual(splitContent[0][3].raw, CONTENT2);
  });

  it('splits headerless paragraphs into its own section', async () => {
    const h1 = '### [Topic 1](topic-1)\n';
    const content = [CONTENT1, h1];
    const notes = content.join('');

    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(notes));
    const splitContent = await WhatsNew.ReleaseNoteView.getMarkdownContent();
    assert.lengthOf(splitContent, 2);
    assert.lengthOf(splitContent[0], 1);
    assert.lengthOf(splitContent[1], 1);

    assert.deepStrictEqual(splitContent[0][0].raw, CONTENT1);
    assert.deepStrictEqual(splitContent[1][0].raw, h1);
  });

  it('renders markdown content', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(CONTENT1));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.pendingUpdate();

    const markdown = releaseNoteView.contentElement.querySelector('devtools-markdown-view');
    assert.isNotNull(markdown);
  });

  it('renders link to video', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(CONTENT1));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.pendingUpdate();
    const link = releaseNoteView.contentElement.querySelector<UI.XLink.XLink>('x-link');
    assert.isNotNull(link);
    assert.deepStrictEqual(link.href, 'https://google.com/');
  });

  it('renders button that links to blogpost', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(CONTENT1));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.pendingUpdate();
    const button = releaseNoteView.contentElement.querySelector<Buttons.Button.Button>('devtools-button');
    assert.isNotNull(button);
    const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');

    button.click();
    assert.strictEqual(openInNewTabStub.callCount, 1);
    assert.isTrue(
        openInNewTabStub.firstCall.calledWith('https://google.com' as Platform.DevToolsPath.UrlString),
        'openInNewTab was not called with the expected URL.');
  });
});
