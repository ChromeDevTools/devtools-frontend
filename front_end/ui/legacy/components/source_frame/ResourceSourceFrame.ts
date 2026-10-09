// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import '../../legacy.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import * as FormatterActions from '../../../../entrypoints/formatter_actions/formatter_actions.js';
import {html, type LitTemplate, nothing, render} from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';

import resourceSourceFrameStyles from './resourceSourceFrame.css.js';
import {type RevealPosition, SourceFrameImpl, type SourceFrameOptions} from './SourceFrame.js';

const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Placeholder text for the search input in the resource source frame.
   */
  find: 'Find',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/ResourceSourceFrame.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ResourceSourceFrame extends SourceFrameImpl {
  readonly #resource: TextUtils.ContentProvider.ContentProvider;
  readonly #givenContentType: string;

  constructor(resource: TextUtils.ContentProvider.ContentProvider, givenContentType: string,
              options?: SourceFrameOptions, element?: HTMLElement) {
    const isStreamingProvider = TextUtils.ContentProvider.isStreamingContentProvider(resource);

    const lazyContent = isStreamingProvider ?
        () => resource.requestStreamingContent().then(TextUtils.StreamingContentData.asContentDataOrError) :
        () => resource.requestContentData();
    super(lazyContent, options, element);

    this.#givenContentType = givenContentType;
    this.#resource = resource;
    if (isStreamingProvider) {
      void resource.requestStreamingContent().then(streamingContent => {
        if (!TextUtils.StreamingContentData.isError(streamingContent)) {
          streamingContent.addEventListener(TextUtils.StreamingContentData.Events.CHUNK_ADDED, () => {
            void this.setContentDataOrError(Promise.resolve(streamingContent.content()));
          });
        }
      });
    }
  }

  static createSearchableView(resource: TextUtils.ContentProvider.ContentProvider,
                              contentType: string): UI.Widget.Widget {
    return new SearchableContainer(resource, contentType);
  }

  protected override getContentType(): string {
    return this.#givenContentType;
  }

  get resource(): TextUtils.ContentProvider.ContentProvider {
    return this.#resource;
  }

  protected override populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number,
                                                 columnNumber: number): void {
    super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    contextMenu.appendApplicableItems(this.#resource);
  }
}

export interface ViewInput {
  sourceFrame: ResourceSourceFrame;
  toolbarItems: LitTemplate;
  placeholder: string;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target): void => {
  // clang-format off
  render(html`
    <style>${resourceSourceFrameStyles}</style>
    <devtools-widget class="searchable-view"
      ${widget(UI.SearchableView.SearchableView, {
        searchProvider: input.sourceFrame,
        replaceProvider: input.sourceFrame,
        searchTarget: input.sourceFrame,
        placeholder: input.placeholder,
      })}
    >
      <devtools-widget ${widget(UI.Widget.WrapperWidget, {widget: input.sourceFrame})}></devtools-widget>
    </devtools-widget>
    <devtools-toolbar class="toolbar">${input.toolbarItems}</devtools-toolbar>`,
    target);
  // clang-format on
};

export class SearchableContainer extends UI.Widget.VBox {
  readonly #sourceFrame: ResourceSourceFrame;
  readonly #view: View;
  #toolbarItems: LitTemplate = nothing;

  constructor(resource: TextUtils.ContentProvider.ContentProvider, contentType: string, element?: HTMLElement,
              view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    const simpleContentType = Common.ResourceType.ResourceType.simplifyContentType(contentType);
    this.#sourceFrame = new ResourceSourceFrame(resource, simpleContentType);
    const canPrettyPrint = FormatterActions.FORMATTABLE_MEDIA_TYPES.includes(simpleContentType);
    this.#sourceFrame.setCanPrettyPrint(canPrettyPrint, true /* autoPrettyPrint */);
    this.performUpdate();

    void this.#sourceFrame.toolbarItems().then(items => {
      this.#toolbarItems = items;
      this.requestUpdate();
    });
  }

  override performUpdate(): void {
    this.#view({
      sourceFrame: this.#sourceFrame,
      toolbarItems: this.#toolbarItems,
      placeholder: i18nString(UIStrings.find),
    },
               {}, this.contentElement);
  }

  async revealPosition(position: RevealPosition): Promise<void> {
    this.#sourceFrame.revealPosition(position, true);
  }
}
