// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as MarkdownView from '../../markdown_view/markdown_view.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const container = document.getElementById('container');

function appendCodeBlock(
    data: {displayNotice: boolean, displayToolbar: boolean, heading?: MarkdownView.CodeBlock.Heading}): void {
  const component = new MarkdownView.CodeBlock.CodeBlock();
  container?.appendChild(document.createTextNode(JSON.stringify(data)));
  container?.appendChild(component);
  component.codeLang = 'js';
  component.code = `MarkdownView.MarkdownImagesMap.markdownImages.set('lighthouse-icon', {
    src: '../../Images/lighthouse_logo.svg',
    width: '16px',
    height: '16px',
    isIcon: true,
  });
  MarkdownView.MarkdownImagesMap.markdownImages.set('baseline', {
    src: '../../Images/align-items-baseline.svg',
    width: '200px',
    height: '200px',
    isIcon: false,
  });`;
  component.displayNotice = data.displayNotice;
  component.displayToolbar = data.displayToolbar;
  if (data.heading) {
    component.heading = data.heading;
  }
}

appendCodeBlock({displayNotice: true, displayToolbar: true, heading: {text: 'Code executed', showCopyButton: false}});
appendCodeBlock({displayNotice: false, displayToolbar: true, heading: {text: 'Code executed', showCopyButton: false}});
appendCodeBlock({displayNotice: true, displayToolbar: false, heading: {text: 'Code executed', showCopyButton: false}});
appendCodeBlock({displayNotice: false, displayToolbar: false, heading: {text: 'Code executed', showCopyButton: false}});

appendCodeBlock({displayNotice: true, displayToolbar: true, heading: {text: 'Code executed', showCopyButton: true}});
appendCodeBlock({displayNotice: false, displayToolbar: true, heading: {text: 'Code executed', showCopyButton: true}});
appendCodeBlock({displayNotice: true, displayToolbar: false, heading: {text: 'Code executed', showCopyButton: true}});
appendCodeBlock({displayNotice: false, displayToolbar: false, heading: {text: 'Code executed', showCopyButton: true}});

appendCodeBlock({displayNotice: true, displayToolbar: true});
appendCodeBlock({displayNotice: false, displayToolbar: true});
appendCodeBlock({displayNotice: true, displayToolbar: false});
appendCodeBlock({displayNotice: false, displayToolbar: false});
