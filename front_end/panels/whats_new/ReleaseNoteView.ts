// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/markdown_view/markdown_view.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Marked from '../../third_party/marked/marked.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {getReleaseNote, type ReleaseNote, VideoType} from './ReleaseNoteText.js';
import releaseNoteViewStyles from './releaseNoteView.css.js';

const UIStrings = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  seeFeatures: 'See all new features',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/whats_new/ReleaseNoteView.ts', UIStrings);

const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const WHATS_NEW_THUMBNAIL = '../../Images/whatsnew.svg' as Platform.DevToolsPath.RawPathString;
export const DEVTOOLS_TIPS_THUMBNAIL = '../../Images/devtools-tips.svg' as Platform.DevToolsPath.RawPathString;
export const GENERAL_THUMBNAIL = '../../Images/devtools-thumbnail.svg' as Platform.DevToolsPath.RawPathString;

export interface ViewInput {
  markdownContent: Marked.Marked.Token[][];
  getReleaseNote: () => ReleaseNote;
  openNewTab: (link: string) => void;
  getThumbnailPath: (type: VideoType) => Platform.DevToolsPath.UrlString;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export type ViewOutput = unknown;

export async function getMarkdownContent(): Promise<Marked.Marked.Token[][]> {
  const markdown = await ReleaseNoteView.getFileContent();
  const markdownAst = Marked.Marked.lexer(markdown);
  const splitMarkdownAst: Marked.Marked.Token[][] = [];

  // Split markdown content into groups of content to be rendered together.
  // Each topic is supposed to be rendered in a separate card.
  let groupStartDepth = Number.MAX_SAFE_INTEGER;
  markdownAst.forEach((token: Marked.Marked.Token) => {
    if (token.type === 'heading' && groupStartDepth >= token.depth) {
      splitMarkdownAst.push([token]);
      groupStartDepth = token.depth;
    } else if (splitMarkdownAst.length > 0) {
      splitMarkdownAst[splitMarkdownAst.length - 1].push(token);
    } else {
      // Missing a heading. Add to a separate section.
      splitMarkdownAst.push([token]);
    }
  });
  return splitMarkdownAst;
}

export class ReleaseNoteView extends UI.Panel.Panel {
  #view: View;

  constructor(view: View = (input, _output, target) => {
    const releaseNote = input.getReleaseNote();
    const markdownContent = input.markdownContent;
    // clang-format off
    render(html`
      <style>${releaseNoteViewStyles}</style>
      <div class="whatsnew" jslog=${VisualLogging.section().context('release-notes')}>
        <div class="whatsnew-content">
          <div class="header">
            ${releaseNote.header}
          </div>
          <div>
            <devtools-button
                  .variant=${Buttons.Button.Variant.PRIMARY}
                  .jslogContext=${'learn-more'}
                  @click=${() => input.openNewTab(releaseNote.link)}
              >${i18nString(UIStrings.seeFeatures)}</devtools-button>
          </div>

          <div class="feature-container">
            <div class="video-container">
              ${releaseNote.videoLinks.map((value: {description: string, link: Platform.DevToolsPath.UrlString, type?: VideoType}) => {
                return html`
                  <x-link
                  href=${value.link}
                  jslog=${VisualLogging.link().track({click: true}).context('learn-more')}>
                    <div class="video">
                      <img class="thumbnail" src=${input.getThumbnailPath(value.type ?? VideoType.WHATS_NEW)}>
                      <div class="thumbnail-description"><span>${value.description}</span></div>
                    </div>
                </x-link>
                `;
              })}
            </div>
            ${markdownContent.map((markdown: Marked.Marked.Token[]) => {
              return html`
                  <div class="feature">
                    <devtools-markdown-view slot="content" .data=${{tokens: markdown}}>
                    </devtools-markdown-view>
                  </div>`;
            })}
          </div>
        </div>
      </div>
    `, target);
    // clang-format on
  }) {
    super('whats-new', true);
    this.#view = view;
    this.requestUpdate();
  }

  static async getFileContent(): Promise<string> {
    const url = new URL('./resources/WNDT.md', import.meta.url);
    try {
      const response = await fetch(url.toString());
      return await response.text();
    } catch {
      throw new Error(`Markdown file ${
          url.toString()} not found. Make sure it is correctly listed in the relevant BUILD.gn files.`);
    }
  }

  override async performUpdate(): Promise<void> {
    const markdownContent = await getMarkdownContent();
    this.#view(
        {
          getReleaseNote,
          openNewTab: UI.UIUtils.openInNewTab,
          markdownContent,
          getThumbnailPath: this.#getThumbnailPath,
        },
        this, this.contentElement);
  }

  #getThumbnailPath(type: VideoType): Platform.DevToolsPath.UrlString {
    let img;
    switch (type) {
      case VideoType.WHATS_NEW:
        img = WHATS_NEW_THUMBNAIL;
        break;
      case VideoType.DEVTOOLS_TIPS:
        img = DEVTOOLS_TIPS_THUMBNAIL;
        break;
      case VideoType.OTHER:
        img = GENERAL_THUMBNAIL;
        break;
    }
    return new URL(img, import.meta.url).toString() as Platform.DevToolsPath.UrlString;
  }
}
