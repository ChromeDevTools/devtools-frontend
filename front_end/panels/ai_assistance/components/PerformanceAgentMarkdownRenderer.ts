// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Trace from '../../../models/trace/trace.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';

import {MarkdownRendererWithCodeBlock} from './MarkdownRendererWithCodeBlock.js';

const {html} = Lit;

export class PerformanceAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
  constructor(private lookupEvent: (key: Trace.Types.File.SerializableKey) => Trace.Types.Events.Event | null) {
    super();
  }

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'link' && token.href.startsWith('#')) {
      const event = this.lookupEvent(token.href.slice(1) as Trace.Types.File.SerializableKey);
      if (event) {
        let label = token.text;
        let title = '';
        if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
          title = event.args.data.url;
        } else {
          label += ` (${event.name})`;
        }

        // eslint-disable-next-line rulesdir/no-a-tags-in-lit
        return html`<a href="#" draggable=false .title=${title} @click=${(e: Event) => {
          e.stopPropagation();
          void Common.Revealer.reveal(new SDK.TraceObject.RevealableEvent(event));
        }}>${label}</a>`;
      }
    }

    return super.templateForToken(token);
  }
}
