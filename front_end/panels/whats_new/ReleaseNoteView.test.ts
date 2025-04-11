// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as WhatsNew from './whats_new.js';

const {urlString} = Platform.DevToolsPath;
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
          videoLinks: [
            {
              description: 'Highlight from the Chrome 132 update',
              link: urlString`https://developer.chrome.com/blog/new-in-devtools-132/`,
              type: WhatsNew.ReleaseNoteText.VideoType.WHATS_NEW,
            },
            {
              description: 'DevTools tips',
              link: urlString`https://developer.chrome.com/blog/devtools-tips-39`,
              type: WhatsNew.ReleaseNoteText.VideoType.DEVTOOLS_TIPS,
            },
            {
              description: 'Other',
              link: urlString`https://developer.chrome.com/`,
              type: WhatsNew.ReleaseNoteText.VideoType.OTHER,
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
      assert.deepEqual(splitContent[i][0].type, 'heading');
      assert.deepEqual(splitContent[i][1].type, 'paragraph');
      assert.deepEqual(splitContent[i][0].raw, content[i * 2]);
      assert.deepEqual(splitContent[i][1].raw, content[i * 2 + 1]);
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

    assert.deepEqual(splitContent[0][0].raw, h1);
    assert.deepEqual(splitContent[0][1].raw, CONTENT1);
    assert.deepEqual(splitContent[0][2].raw, h2);
    assert.deepEqual(splitContent[0][3].raw, CONTENT2);
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

    assert.deepEqual(splitContent[0][0].raw, CONTENT1);
    assert.deepEqual(splitContent[1][0].raw, h1);
  });

  it('renders markdown content', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(CONTENT1));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.updateComplete;

    const markdown = releaseNoteView.contentElement.querySelector('devtools-markdown-view');
    assert.isNotNull(markdown);
  });

  it('renders button that links to blogpost', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(''));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.updateComplete;
    const button = releaseNoteView.contentElement.querySelector<Buttons.Button.Button>('devtools-button');
    assert.isNotNull(button);
    const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');

    button.click();
    sinon.assert.callCount(openInNewTabStub, 1);
    assert.isTrue(
        openInNewTabStub.firstCall.calledWith(urlString`https://google.com/`),
        'openInNewTab was not called with the expected URL.');
  });

  it('renders video links with description text', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(''));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.updateComplete;
    const videos = releaseNoteView.contentElement.querySelectorAll<UI.XLink.XLink>('.video-container > x-link');
    assert.lengthOf(videos, 3);

    const releaseNotes = WhatsNew.ReleaseNoteText.getReleaseNote();
    const descriptions = Array.from(videos).map(n => n.innerText.trim());
    const expectedDescriptions = releaseNotes.videoLinks.map(video => video.description);
    assert.deepEqual(descriptions, expectedDescriptions);
  });

  it('renders expected thumbnails', async () => {
    sinon.stub(WhatsNew.ReleaseNoteView.ReleaseNoteView, 'getFileContent').returns(Promise.resolve(''));
    const releaseNoteView = new WhatsNew.ReleaseNoteView.ReleaseNoteView();
    await releaseNoteView.updateComplete;
    const thumbnails = releaseNoteView.contentElement.querySelectorAll<HTMLImageElement>('.thumbnail');
    assert.lengthOf(thumbnails, 3);

    const thumbnailFilepaths = Array.from(thumbnails).map(n => n.src);
    const expectedThumbnails = [
      WhatsNew.ReleaseNoteView.WHATS_NEW_THUMBNAIL,
      WhatsNew.ReleaseNoteView.DEVTOOLS_TIPS_THUMBNAIL,
      WhatsNew.ReleaseNoteView.GENERAL_THUMBNAIL,
    ];
    const expectedFilepaths = expectedThumbnails.map(src => new URL(src, import.meta.url).toString());

    assert.deepEqual(thumbnailFilepaths, expectedFilepaths);
  });
});
