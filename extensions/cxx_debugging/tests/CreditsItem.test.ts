// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../src/CreditsItem.js';

import {assert} from 'chai';
import {html, render, type TemplateResult} from 'lit-html';

import type {CreditsItem, CreditsItemData} from '../src/CreditsItem.js';

import {nonNull} from './TestUtils.js';

async function createItem(text: TemplateResult): Promise<CreditsItem> {
  const container = document.createElement('div');
  render(text, container);
  const el = nonNull(container.firstElementChild) as CreditsItem;
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  return el;
}

describe('CreditsItem', () => {
  it('is accessible', async () => {
    const el = await createItem(html`<devtools-cxx-debugging-credits-item></devtools-cxx-debugging-credits-item>`);
    assert.isNotNull(el.shadowRoot);
  });

  it('can get and set data correctly', async () => {
    const data: CreditsItemData = {
      title: 'My awesome project',
      homepage: 'https://www.example.com',
      license: 'Do whatever you want!'
    };
    const el = await createItem(
        html`<devtools-cxx-debugging-credits-item .data=${data}></devtools-cxx-debugging-credits-item>`);
    assert.strictEqual(el.data, data);

    el.data = {title: 'title', homepage: 'homepage', license: 'license'};
    assert.strictEqual(el.data.title, 'title');
    assert.strictEqual(el.data.homepage, 'homepage');
    assert.strictEqual(el.data.license, 'license');
  });

  it('renders title and homepage correctly', async () => {
    const data: CreditsItemData = {title: 'My project', homepage: 'https://www.example.com', license: '3-BSD License'};
    const el = await createItem(
        html`<devtools-cxx-debugging-credits-item .data=${data}></devtools-cxx-debugging-credits-item>`);
    assert.deepEqual(el.shadowRoot?.querySelector('.title')?.textContent, data.title);
    assert.deepEqual(el.shadowRoot?.querySelector('a')?.getAttribute('href'), data.homepage);
  });
});
