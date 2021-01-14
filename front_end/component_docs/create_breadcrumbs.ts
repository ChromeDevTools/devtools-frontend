// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../third_party/lit-html/lit-html.js';


export function init(): void {
  const container = document.createElement('ul');
  // clang-format off
  LitHtml.render(LitHtml.html`

  <style>
    .docs-breadcrumbs {
      display: flex;
      list-style: none;
      position: absolute;
      bottom: 0;
      left: 10px;
      width: 300px;
      padding: 0;
    }

    .docs-breadcrumbs li a {
      display: block;
      padding: 10px;
      font-size: 16px;
    }

    .docs-breadcrumbs span {
      font-size: 20px;
    }
  </style>

  <ul class="docs-breadcrumbs">
    <li><a href="/">Index</a></li>
    <li><a href=".">All component examples</a></li>
  </ul>`, container);
  // clang-format on

  document.body.appendChild(container);
}
