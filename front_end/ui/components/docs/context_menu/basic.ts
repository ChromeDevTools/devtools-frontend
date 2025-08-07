// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../legacy/legacy.js';
import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = Lit;

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

{
  const menuButtonSection = document.querySelector('#menu-button') as HTMLElement;
  Lit.render(
      html`
    <devtools-menu-button
      icon-name="bin"
      .populateMenuCall=${(menu: UI.ContextMenu.ContextMenu) => {
        menu.defaultSection().appendItem('Item', () => {
          alert('Item clicked');
        }, {jslogContext: 'item'});
      }}
      jslogContext="my-menu-button"
    ></devtools-menu-button>
`,
      menuButtonSection);
}

{
  let checked = true;
  const simpleItemMenuSection = document.querySelector('#simple-items');
  simpleItemMenuSection?.addEventListener('contextmenu', onSimpleMenu.bind(this));

  function onSimpleMenu(event: Event) {
    const simpleMenu = new UI.ContextMenu.ContextMenu(event);

    // Regular item
    simpleMenu.defaultSection().appendItem('Regular item', () => {
      alert('Regular item clicked ');
    }, {jslogContext: 'regular-item'});

    // Disabled item
    simpleMenu.defaultSection().appendItem('Disabled item', () => {
      alert('Will not be printed');
    }, {jslogContext: 'disabled-item', disabled: true});

    // Experimental item
    simpleMenu.defaultSection().appendItem('Experimental item', () => {
      alert('Experimental item clicked');
    }, {jslogContext: 'experimental-item', isPreviewFeature: true});

    // Separator
    simpleMenu.defaultSection().appendSeparator();

    // Checkbox item
    simpleMenu.defaultSection().appendCheckboxItem('Checkbox item', () => {
      alert('Checkbox item clicked');
      checked = !checked;
    }, {checked, jslogContext: 'checkbox-item'});

    void simpleMenu.show();
  }
}

{
  const customSectionMenuSection = document.querySelector('#custom-section');
  customSectionMenuSection?.addEventListener('contextmenu', onCustomSectionMenu.bind(this));

  function onCustomSectionMenu(event: Event) {
    const customSectionMenu = new UI.ContextMenu.ContextMenu(event);

    // First custom section
    const customSection = customSectionMenu.section('Custom section');
    customSection.appendItem('Section inner item 1', () => {/* ... */}, {jslogContext: 'my-inner-item-1'});
    customSection.appendItem('Section inner item 2', () => {/* ... */}, {jslogContext: 'my-inner-item-2'});

    // Second custom section
    const customSection2 = customSectionMenu.section('Custom section 2');
    customSection2.appendItem('Section inner item 1', () => {/* ... */}, {jslogContext: 'my-inner-item-3'});

    void customSectionMenu.show();
  }
}

{
  const subMenuSection = document.querySelector('#sub-menu');
  subMenuSection?.addEventListener('contextmenu', onCustomSectionMenu.bind(this));

  function onCustomSectionMenu(event: Event) {
    const subMenuMenu = new UI.ContextMenu.ContextMenu(event);

    const subMenu =
        subMenuMenu.defaultSection().appendSubMenuItem('Item to open sub menu', /* disabled */ false, 'my-sub-menu');
    subMenu.defaultSection().appendItem('Sub menu inner item 1', () => {/* ... */}, {jslogContext: 'my-inner-item-1'});
    subMenu.defaultSection().appendItem('Sub menu inner item 2', () => {/* ... */}, {jslogContext: 'my-inner-item-2'});

    void subMenuMenu.show();
  }
}
