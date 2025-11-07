// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../lit/lit.js';
import { ContextMenu } from './legacy.js';
const { html } = Lit;
export async function render(container) {
    const style = document.createElement('style');
    style.textContent = `
      #container > div {
        width: var(--sys-size-34);
        padding: var(--sys-size-11);
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--sys-size-5);
        background-color: var(--sys-color-neutral-container);
        border-radius: var(--sys-shape-corner-medium);
        text-align: center;

        p {
          vertical-align: middle;
        }
      }
    `;
    container.appendChild(style);
    const menuButtonSection = document.createElement('div');
    const menuButtonHeader = document.createElement('header');
    menuButtonHeader.textContent = 'DevTools menu button (lit-html)';
    container.appendChild(menuButtonHeader);
    container.appendChild(menuButtonSection);
    Lit.render(html `
    <devtools-menu-button
      icon-name="bin"
      .populateMenuCall=${(menu) => {
        menu.defaultSection().appendItem('Item', () => {
            alert('Item clicked');
        }, { jslogContext: 'item' });
    }}
      jslogContext="my-menu-button"
    ></devtools-menu-button>
`, menuButtonSection);
    const simpleItemsSection = document.createElement('div');
    simpleItemsSection.innerHTML = '<p>Right-click here</p>';
    const simpleItemsHeader = document.createElement('header');
    simpleItemsHeader.textContent = 'Various simple menu items (imperative API)';
    container.appendChild(simpleItemsHeader);
    container.appendChild(simpleItemsSection);
    let checked = true;
    simpleItemsSection.addEventListener('contextmenu', onSimpleMenu);
    function onSimpleMenu(event) {
        const simpleMenu = new ContextMenu.ContextMenu(event);
        // Regular item
        simpleMenu.defaultSection().appendItem('Regular item', () => {
            alert('Regular item clicked ');
        }, { jslogContext: 'regular-item' });
        // Disabled item
        simpleMenu.defaultSection().appendItem('Disabled item', () => {
            alert('Will not be printed');
        }, { jslogContext: 'disabled-item', disabled: true });
        // Experimental item
        simpleMenu.defaultSection().appendItem('Experimental item', () => {
            alert('Experimental item clicked');
        }, { jslogContext: 'experimental-item', isPreviewFeature: true });
        // Separator
        simpleMenu.defaultSection().appendSeparator();
        // Checkbox item
        simpleMenu.defaultSection().appendCheckboxItem('Checkbox item', () => {
            alert('Checkbox item clicked');
            checked = !checked;
        }, { checked, jslogContext: 'checkbox-item' });
        void simpleMenu.show();
    }
    const customSection = document.createElement('div');
    customSection.innerHTML = '<p>Right-click here</p>';
    const customSectionHeader = document.createElement('header');
    customSectionHeader.textContent = 'Custom sections (imperative API)';
    container.appendChild(customSectionHeader);
    container.appendChild(customSection);
    customSection.addEventListener('contextmenu', onCustomSectionMenu);
    function onCustomSectionMenu(event) {
        const customSectionMenu = new ContextMenu.ContextMenu(event);
        // First custom section
        const customSection = customSectionMenu.section('Custom section');
        customSection.appendItem('Section inner item 1', () => { }, { jslogContext: 'my-inner-item-1' });
        customSection.appendItem('Section inner item 2', () => { }, { jslogContext: 'my-inner-item-2' });
        // Second custom section
        const customSection2 = customSectionMenu.section('Custom section 2');
        customSection2.appendItem('Section inner item 1', () => { }, { jslogContext: 'my-inner-item-3' });
        void customSectionMenu.show();
    }
    const subMenuSection = document.createElement('div');
    subMenuSection.innerHTML = '<p>Right-click here</p>';
    const subMenuHeader = document.createElement('header');
    subMenuHeader.textContent = 'Sub menu (imperative API)';
    container.appendChild(subMenuHeader);
    container.appendChild(subMenuSection);
    subMenuSection.addEventListener('contextmenu', onSubMenu);
    function onSubMenu(event) {
        const subMenuMenu = new ContextMenu.ContextMenu(event);
        const subMenu = subMenuMenu.defaultSection().appendSubMenuItem('Item to open sub menu', /* disabled */ false, 'my-sub-menu');
        subMenu.defaultSection().appendItem('Sub menu inner item 1', () => { }, { jslogContext: 'my-inner-item-1' });
        subMenu.defaultSection().appendItem('Sub menu inner item 2', () => { }, { jslogContext: 'my-inner-item-2' });
        void subMenuMenu.show();
    }
}
//# sourceMappingURL=ContextMenu.docs.js.map