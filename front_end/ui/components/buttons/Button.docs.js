// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Button, FloatingButton } from './buttons.js';
export function render(container) {
    const buttonDocs = container.createChild('div', 'button-docs');
    const style = document.createElement('style');
    style.textContent = `
      .button-docs > div {
        width: 80%;
        padding: var(--sys-size-11);
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--sys-size-5);
      }
    `;
    buttonDocs.appendChild(style);
    const appendSection = (headerText, sectionElement) => {
        const header = document.createElement('header');
        header.textContent = headerText;
        buttonDocs.appendChild(header);
        buttonDocs.appendChild(sectionElement);
    };
    const buttonsSection = document.createElement('div');
    const primarySection = document.createElement('div');
    const tonalSection = document.createElement('div');
    const outlineSection = document.createElement('div');
    const textSection = document.createElement('div');
    const iconSection = document.createElement('div');
    const floatingSection = document.createElement('div');
    appendSection('Buttons', buttonsSection);
    appendSection('Primary buttons', primarySection);
    appendSection('Tonal buttons', tonalSection);
    appendSection('Outlined buttons', outlineSection);
    appendSection('Text buttons', textSection);
    appendSection('Icon buttons', iconSection);
    appendSection('Floating buttons', floatingSection);
    const DEFAULT_TEXT = 'Default';
    const WITH_ICON_TEXT = 'With icon';
    const MICRO_TEXT = 'Micro';
    // Buttons
    {
        const primaryButton = new Button.Button();
        primaryButton.data = {
            variant: "primary" /* Button.Variant.PRIMARY */,
        };
        primaryButton.innerText = 'Primary button';
        buttonsSection.appendChild(primaryButton);
        const tonalButton = new Button.Button();
        tonalButton.data = {
            variant: "tonal" /* Button.Variant.TONAL */,
        };
        tonalButton.innerText = 'Tonal button';
        buttonsSection.appendChild(tonalButton);
        const outlinedButton = new Button.Button();
        outlinedButton.data = {
            variant: "outlined" /* Button.Variant.OUTLINED */,
        };
        outlinedButton.innerText = 'Outlined button';
        buttonsSection.appendChild(outlinedButton);
        const textButton = new Button.Button();
        textButton.data = {
            variant: "text" /* Button.Variant.TEXT */,
        };
        textButton.innerText = 'Text button';
        buttonsSection.appendChild(textButton);
        const iconButton = new Button.Button();
        iconButton.data = {
            variant: "icon" /* Button.Variant.ICON */,
            iconName: 'gear',
        };
        buttonsSection.appendChild(iconButton);
    }
    // Primary buttons
    {
        const primaryDefault = new Button.Button();
        primaryDefault.data = {
            variant: "primary" /* Button.Variant.PRIMARY */,
        };
        primaryDefault.innerText = DEFAULT_TEXT;
        primarySection.appendChild(primaryDefault);
        const primaryWithIcon = new Button.Button();
        primaryWithIcon.innerText = WITH_ICON_TEXT;
        primaryWithIcon.data = {
            variant: "primary" /* Button.Variant.PRIMARY */,
            iconName: 'plus',
        };
        primarySection.appendChild(primaryWithIcon);
    }
    // Tonal buttons
    {
        const tonalDefault = new Button.Button();
        tonalDefault.data = {
            variant: "tonal" /* Button.Variant.TONAL */,
        };
        tonalDefault.innerText = DEFAULT_TEXT;
        tonalSection.appendChild(tonalDefault);
        const tonalWithIcon = new Button.Button();
        tonalWithIcon.innerText = WITH_ICON_TEXT;
        tonalWithIcon.data = {
            variant: "primary" /* Button.Variant.PRIMARY */,
            iconName: 'plus',
        };
        tonalSection.appendChild(tonalWithIcon);
    }
    // Outlined buttons
    {
        const outlinedDefault = new Button.Button();
        outlinedDefault.data = {
            variant: "outlined" /* Button.Variant.OUTLINED */,
        };
        outlinedDefault.innerText = DEFAULT_TEXT;
        outlineSection.appendChild(outlinedDefault);
        const outlinedWithIcon = new Button.Button();
        outlinedWithIcon.innerText = WITH_ICON_TEXT;
        outlinedWithIcon.data = {
            variant: "outlined" /* Button.Variant.OUTLINED */,
            iconName: 'plus',
        };
        outlineSection.appendChild(outlinedWithIcon);
        const outlinedMicro = new Button.Button();
        outlinedMicro.innerText = MICRO_TEXT;
        outlinedMicro.data = {
            variant: "outlined" /* Button.Variant.OUTLINED */,
            size: "MICRO" /* Button.Size.MICRO */,
        };
        outlineSection.appendChild(outlinedMicro);
    }
    // Text buttons
    {
        const textDefault = new Button.Button();
        textDefault.innerText = DEFAULT_TEXT;
        textDefault.data = {
            variant: "text" /* Button.Variant.TEXT */,
        };
        textSection.appendChild(textDefault);
        const textWithIcon = new Button.Button();
        textWithIcon.innerText = WITH_ICON_TEXT;
        textWithIcon.data = {
            variant: "text" /* Button.Variant.TEXT */,
            iconName: 'plus',
        };
        textSection.appendChild(textWithIcon);
    }
    // Icon buttons
    {
        const iconDefault = new Button.Button();
        iconDefault.data = {
            variant: "icon" /* Button.Variant.ICON */,
            iconName: 'gear',
        };
        iconSection.appendChild(iconDefault);
        const iconToggle = new Button.Button();
        iconToggle.data = {
            variant: "icon_toggle" /* Button.Variant.ICON_TOGGLE */,
            iconName: 'gear',
            toggledIconName: 'gear',
            toggled: true,
            toggleType: "primary-toggle" /* Button.ToggleType.PRIMARY */,
        };
        const toggledWithLabel = document.createElement('span');
        toggledWithLabel.textContent = '(Toggle)';
        iconSection.appendChild(iconToggle);
        iconSection.appendChild(toggledWithLabel);
    }
    // Floating buttons
    {
        const floatingButton = FloatingButton.create('smart-assistant', 'Ask AI!');
        floatingSection.appendChild(floatingButton);
    }
}
//# sourceMappingURL=Button.docs.js.map