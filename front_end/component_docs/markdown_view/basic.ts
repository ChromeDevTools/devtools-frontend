// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Issues from '../../issues/issues.js';
import * as Marked from '../../third_party/marked/marked.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

// Register images in the markdown image map.
Issues.MarkdownImagesMap.markdownImages.set('lighthouse-icon', {
  src: 'Images/lighthouse_logo.svg',
  width: '16px',
  height: '16px',
  isIcon: true,
});
Issues.MarkdownImagesMap.markdownImages.set('baseline', {
  src: 'Images/baseline-icon.svg',
  width: '200px',
  height: '200px',
  isIcon: false,
});

// Register a link in the markdown link map.
Issues.MarkdownLinksMap.markdownLinks.set('test-link', 'https://exampleLink.com/');

const component = new Issues.MarkdownView.MarkdownView();
document.getElementById('container')?.appendChild(component);

const markdownAst = Marked.Marked.lexer(`
Lorem ipsum dolor sit amet, ![icon](lighthouse-icon) consectetur adipiscing elit. [Phasellus tristique](test-link) metus velit, a laoreet sapien ultricies eu. Fusce facilisis, felis id ullamcorper placerat, enim magna porta justo, nec aliquet orci arcu eu velit. Ut quis maximus dolor. Morbi congue tempus porttitor. Duis ut lorem gravida, vehicula mi et, suscipit risus.

* Cras varius cursus eros.
* Mauris non blandit turpis.

Proin posuere varius risus, nec tristique urna elementum ut.

![Image](baseline)

\`Cras id elit at erat porttitor elementum\`. Donec purus nulla, suscipit eu hendrerit in, auctor eu erat. Proin ut accumsan mi, rhoncus interdum odio. Etiam dapibus posuere lorem.
`);

component.data = {
  tokens: markdownAst,
};
