// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../src/CreditsItem.js';

import {html, render, TemplateResult} from 'lit-html';

import {CreditsItem, CreditsItemData} from '../src/CreditsItem.js';

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
    expect(el.shadowRoot).to.not.be.null;
  });

  it('can get and set data correctly', async () => {
    const data: CreditsItemData = {
      title: 'My awesome project',
      homepage: 'https://www.example.com',
      license: 'Do whatever you want!'
    };
    const el = await createItem(
        html`<devtools-cxx-debugging-credits-item .data=${data}></devtools-cxx-debugging-credits-item>`);
    expect(el.data).to.equal(data);

    el.data = {title: 'title', homepage: 'homepage', license: 'license'};
    expect(el.data.title).to.equal('title');
    expect(el.data.homepage).to.equal('homepage');
    expect(el.data.license).to.equal('license');
  });

  it('renders title and homepage correctly', async () => {
    const data: CreditsItemData = {title: 'My project', homepage: 'https://www.example.com', license: '3-BSD License'};
    const el = await createItem(
        html`<devtools-cxx-debugging-credits-item .data=${data}></devtools-cxx-debugging-credits-item>`);
    expect(el.shadowRoot?.querySelector('.title')?.textContent).to.eql(data.title);
    expect(el.shadowRoot?.querySelector('a')?.getAttribute('href')).to.eql(data.homepage);
  });
});
