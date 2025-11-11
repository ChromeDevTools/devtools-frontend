// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';
import { MarkdownImagesMap, MarkdownLinksMap } from './markdown_view.js';
const { html } = Lit;
export function render(container) {
    // Register images in the markdown image map.
    MarkdownImagesMap.markdownImages.set('gear', {
        src: 'gear',
        width: 'var(--sys-size-8)',
        height: 'var(--sys-size-8)',
        isIcon: true,
    });
    MarkdownImagesMap.markdownImages.set('baseline', {
        // Path is relative to served component doc html
        src: './front_end/Images/src/align-items-baseline.svg',
        width: 'var(--sys-size-26)',
        height: 'var(--sys-size-26)',
        isIcon: false,
    });
    // Register a link in the markdown link map.
    MarkdownLinksMap.markdownLinks.set('test-link', 'https://exampleLink.com/');
    const codeForCodeBlock = `
    MarkdownView.MarkdownImagesMap.markdownImages.set('gear', {
      src: 'gear',
      width: 'var(--sys-size-8)',
      height: 'var(--sys-size-8)',
      isIcon: true,
    });
    MarkdownView.MarkdownImagesMap.markdownImages.set('baseline', {
      src: './front_end/Images/src/align-items-baseline.svg',
      width: 'var(--sys-size-26)',
      height: 'var(--sys-size-26)',
      isIcon: false,
    });
  `;
    const markdownAst = Marked.Marked.lexer(`
  Lorem ipsum dolor sit amet, ![icon](gear) consectetur adipiscing elit. [Phasellus tristique](test-link) metus velit, a laoreet sapien ultricies eu. Fusce facilisis, felis id ullamcorper placerat, enim magna porta justo, nec aliquet orci arcu eu velit. Ut quis maximus dolor. Morbi congue tempus porttitor. Duis ut lorem gravida, vehicula mi et, suscipit risus.

  * Cras varius cursus eros.
  * Mauris non blandit turpis.

  Proin posuere varius risus, nec tristique urna elementum ut.

\`\`\`js
console.log('test')
\`\`\`

\`\`\`js
${codeForCodeBlock}
\`\`\`

  ![Image](baseline)

\`Cras id elit at erat porttitor elementum\`. Donec purus nulla, suscipit eu hendrerit in, auctor eu erat. Proin ut accumsan mi, rhoncus interdum odio. Etiam dapibus posuere lorem.
`);
    const codeBlockConfigs = [
        { displayNotice: true, header: '' },
        { displayNotice: false, header: '' },
        { displayNotice: true, header: 'Code executed', showCopyButton: false },
        { displayNotice: false, header: 'Code executed', showCopyButton: false },
        { displayNotice: true, header: 'Code executed', showCopyButton: true },
        { displayNotice: false, header: 'Code executed', showCopyButton: true },
    ];
    Lit.render(html `
    <h2>Basic Markdown View</h2>
    <p>This example shows a basic rendering of Markdown, including custom image and link resolution.</p>
    <devtools-markdown-view .data=${{ tokens: markdownAst }}></devtools-markdown-view>

    <h2>Code Block Examples</h2>
    ${codeBlockConfigs.map(config => html `
      <h3>Configuration: <code>${JSON.stringify(config)}</code></h3>
      <devtools-code-block
        .code=${codeForCodeBlock}
        .codeLang=${'js'}
        .displayNotice=${config.displayNotice}
        .header=${config.header}
        .showCopyButton=${Boolean(config.showCopyButton)}
      ></devtools-code-block>
    `)}
  `, container);
}
//# sourceMappingURL=MarkdownView.docs.js.map