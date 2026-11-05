// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, before, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Root from '../../../core/root/root.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as SettingsUI from '../../settings/settings.js';

import * as ThemeSupport from './theme_support.js';

const COLORS_CSS_SELECTOR = 'link[href*=\'//theme/colors.css\']';

describeWithEnvironment('ThemeSupport', () => {
  let themeSupport: ThemeSupport.ThemeSupport;
  let setting: ReturnType<typeof createFakeSetting<string>>;
  let initialRootClasses: string[];
  let injectedElements: Element[];

  function getLatestColorsLink(doc: Document = document): HTMLLinkElement {
    const links = doc.body.querySelectorAll<HTMLLinkElement>(COLORS_CSS_SELECTOR);
    assert.isAbove(links.length, 0);
    return links[links.length - 1];
  }

  function dispatchColorThemeChanged(colorSource?: Root.Runtime.UserColorSource): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ColorThemeChanged, colorSource);
  }

  beforeEach(() => {
    document.documentElement.classList.remove('baseline-default', 'baseline-grayscale', 'theme-with-dark-background');
    initialRootClasses = Array.from(document.documentElement.classList);
    injectedElements = [];
    setting = createFakeSetting('theme', 'default');
    themeSupport = ThemeSupport.ThemeSupport.instance({forceNew: true, setting});
  });

  afterEach(() => {
    for (const element of injectedElements) {
      element.remove();
    }
    for (const link of document.querySelectorAll(COLORS_CSS_SELECTOR)) {
      link.remove();
    }
    document.documentElement.className = initialRootClasses.join(' ');
  });

  it('calls fetchColors on host ColorThemeChanged', async () => {
    const colorFetchSpy = sinon.spy(themeSupport, 'fetchColorsAndApplyHostTheme');

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ColorThemeChanged);

    sinon.assert.called(colorFetchSpy);
  });

  describe('fetchColors', () => {
    it('fetchColors updates color node url', () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      const originalColorHref = 'devtools://theme/colors.css?sets=ui,chrome';

      const doc = document.implementation.createHTMLDocument();
      const colorsLink = doc.createElement('link');
      colorsLink.href = originalColorHref;
      colorsLink.rel = 'stylesheet';
      doc.head.appendChild(colorsLink);

      themeSupport.addDocumentToTheme(doc);

      const updatedHref = doc.body.querySelector(COLORS_CSS_SELECTOR)!.getAttribute('href');
      assert.notEqual(updatedHref, originalColorHref);
    });
  });

  describe('userColorSource resolution and staging', () => {
    it('applies baseline-default from hostConfig in hosted mode without CSS custom property', () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(true);
      assert.isEmpty(window.getComputedStyle(document.body).getPropertyValue('--user-color-source'));

      updateHostConfig({userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();

      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('applies baseline-default from hostConfig in non-hosted mode once colors.css link loads', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      assert.isEmpty(window.getComputedStyle(document.body).getPropertyValue('--user-color-source'));

      updateHostConfig({userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();

      const link = getLatestColorsLink();
      link.onload!(new Event('load'));
      await Promise.resolve();

      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('applies baseline-grayscale from hostConfig in hosted and non-hosted modes', async () => {
      const isHostedModeStub =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(true);

      updateHostConfig({userColorSource: 'baseline-grayscale'});
      themeSupport.fetchColorsAndApplyHostTheme();

      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isFalse(document.documentElement.classList.contains('baseline-default'));

      document.documentElement.classList.remove('baseline-grayscale');
      isHostedModeStub.returns(false);
      themeSupport.fetchColorsAndApplyHostTheme();

      const link = getLatestColorsLink();
      link.onload!(new Event('load'));
      await Promise.resolve();

      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
    });

    it('clears both baseline classes when hostConfig userColorSource is dynamic', async () => {
      const isHostedModeStub =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(true);
      document.documentElement.classList.add('baseline-default', 'baseline-grayscale');

      updateHostConfig({userColorSource: 'dynamic'});
      themeSupport.fetchColorsAndApplyHostTheme();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

      isHostedModeStub.returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));

      updateHostConfig({userColorSource: 'dynamic'});
      themeSupport.fetchColorsAndApplyHostTheme();
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('applies a host color source that changed before the ColorThemeChanged listener was registered', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});
      const getHostConfigStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig')
                                    .callsFake(callback => callback({userColorSource: 'baseline-grayscale'}));

      themeSupport = ThemeSupport.ThemeSupport.instance({forceNew: true, setting});

      sinon.assert.calledOnce(getHostConfigStub);
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('does not refetch colors when the re-queried host color source is unchanged', () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig')
          .callsFake(callback => callback({userColorSource: 'baseline-default'}));

      themeSupport = ThemeSupport.ThemeSupport.instance({forceNew: true, setting});

      assert.isEmpty(document.querySelectorAll(COLORS_CSS_SELECTOR));
    });

    it('stages live ColorThemeChanged until new colors.css link onload fires even if ui-theme changes synchronously',
       async () => {
         sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
         updateHostConfig({userColorSource: 'baseline-default'});

         themeSupport.fetchColorsAndApplyHostTheme();
         const initialLink = getLatestColorsLink();
         initialLink.onload!(new Event('load'));
         await Promise.resolve();

         assert.isTrue(document.documentElement.classList.contains('baseline-default'));
         assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

         dispatchColorThemeChanged('baseline-grayscale');
         const newLink = getLatestColorsLink();
         assert.notStrictEqual(newLink, initialLink);

         // Before newLink.onload fires, the previous baseline-default class must remain active.
         await Promise.resolve();
         assert.isTrue(initialLink.isConnected);
         assert.isTrue(document.documentElement.classList.contains('baseline-default'));
         assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

         // Synchronous #applyTheme() via ui-theme change must still preserve the active class until onload.
         setting.set('dark');
         assert.isTrue(document.documentElement.classList.contains('theme-with-dark-background'));
         assert.isTrue(document.documentElement.classList.contains('baseline-default'));
         assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

         // Firing newLink.onload removes the old link and commits baseline-grayscale.
         newLink.onload!(new Event('load'));
         await Promise.resolve();

         assert.isFalse(initialLink.isConnected);
         assert.isTrue(newLink.isConnected);
         assert.isFalse(document.documentElement.classList.contains('baseline-default'));
         assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));

         // Subsequent live ColorThemeChanged to dynamic clears both baseline classes on onload.
         dispatchColorThemeChanged('dynamic');
         const dynamicLink = getLatestColorsLink();
         assert.notStrictEqual(dynamicLink, newLink);
         assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));

         dynamicLink.onload!(new Event('load'));
         await Promise.resolve();

         assert.isFalse(newLink.isConnected);
         assert.isFalse(document.documentElement.classList.contains('baseline-default'));
         assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
       });

    it('stages ColorThemeChanged independently per document until each document link loads', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});

      themeSupport.fetchColorsAndApplyHostTheme();
      const primaryInitialLink = getLatestColorsLink(document);
      primaryInitialLink.onload!(new Event('load'));

      const secondaryDoc = document.implementation.createHTMLDocument();
      themeSupport.addDocumentToTheme(secondaryDoc);
      const secondaryInitialLink = getLatestColorsLink(secondaryDoc);
      secondaryInitialLink.onload!(new Event('load'));
      await Promise.resolve();

      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(secondaryDoc.documentElement.classList.contains('baseline-default'));

      dispatchColorThemeChanged('baseline-grayscale');
      const primaryNewLink = getLatestColorsLink(document);
      const secondaryNewLink = getLatestColorsLink(secondaryDoc);

      // Fire onload on primary document first; secondary document must keep baseline-default.
      primaryNewLink.onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isTrue(secondaryDoc.documentElement.classList.contains('baseline-default'));
      assert.isFalse(secondaryDoc.documentElement.classList.contains('baseline-grayscale'));

      // Even if ui-theme updates synchronously now, secondaryDoc must keep baseline-default until its link loads.
      setting.set('dark');
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isTrue(secondaryDoc.documentElement.classList.contains('baseline-default'));
      assert.isFalse(secondaryDoc.documentElement.classList.contains('baseline-grayscale'));

      // Now fire onload on secondary document.
      secondaryNewLink.onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(secondaryDoc.documentElement.classList.contains('baseline-default'));
      assert.isTrue(secondaryDoc.documentElement.classList.contains('baseline-grayscale'));
      assert.isFalse(primaryInitialLink.isConnected);
      assert.isFalse(secondaryInitialLink.isConnected);
    });

    it('applies latest live ColorThemeChanged source instead of stale hostConfig to newly added secondary documents',
       async () => {
         sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
         updateHostConfig({userColorSource: 'baseline-default'});

         themeSupport.fetchColorsAndApplyHostTheme();
         getLatestColorsLink(document).onload!(new Event('load'));
         await Promise.resolve();

         dispatchColorThemeChanged('baseline-grayscale');
         getLatestColorsLink(document).onload!(new Event('load'));
         await Promise.resolve();

         const secondaryDoc = document.implementation.createHTMLDocument();
         themeSupport.addDocumentToTheme(secondaryDoc);
         const secondaryLink = getLatestColorsLink(secondaryDoc);
         secondaryLink.onload!(new Event('load'));
         await Promise.resolve();

         assert.isTrue(secondaryDoc.documentElement.classList.contains('baseline-grayscale'));
         assert.isFalse(secondaryDoc.documentElement.classList.contains('baseline-default'));
       });

    it('ignores superseded ColorThemeChanged link onload when rapid back-to-back events fire', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});

      themeSupport.fetchColorsAndApplyHostTheme();
      const initialLink = getLatestColorsLink();
      initialLink.onload!(new Event('load'));
      await Promise.resolve();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));

      dispatchColorThemeChanged('baseline-grayscale');
      const link1 = getLatestColorsLink();
      dispatchColorThemeChanged('dynamic');
      const link2 = getLatestColorsLink();

      assert.notStrictEqual(link1, initialLink);
      assert.notStrictEqual(link2, link1);

      // Stale link1 finishes first while link2 is still pending; must not apply baseline-grayscale and must self-remove.
      link1.onload!(new Event('load'));
      await Promise.resolve();

      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isFalse(link1.isConnected);
      assert.isTrue(link2.isConnected);

      // Latest link2 finishes; commits dynamic and leaves only link2 in document.body.
      link2.onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
      const remainingLinks = document.body.querySelectorAll<HTMLLinkElement>(COLORS_CSS_SELECTOR);
      assert.lengthOf(remainingLinks, 1);
      assert.strictEqual(remainingLinks[0], link2);
    });

    it('ignores stale ColorThemeChanged link onload firing out of order after newer link has committed', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      updateHostConfig({userColorSource: 'baseline-default'});

      themeSupport.fetchColorsAndApplyHostTheme();
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      dispatchColorThemeChanged('baseline-grayscale');
      const link1 = getLatestColorsLink();
      dispatchColorThemeChanged('dynamic');
      const link2 = getLatestColorsLink();

      link2.onload!(new Event('load'));
      await Promise.resolve();
      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

      link1.onload?.(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
      assert.isFalse(link1.isConnected);
      const remainingLinks = document.body.querySelectorAll<HTMLLinkElement>(COLORS_CSS_SELECTOR);
      assert.lengthOf(remainingLinks, 1);
      assert.strictEqual(remainingLinks[0], link2);
    });

    it('clears baseline-default and forces baseline-grayscale when chrome-theme-colors is false', async () => {
      const isHostedModeStub =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(true);
      const chromeThemeColorsSetting =
          Common.Settings.Settings.instance().resolve(SettingsUI.MainSettings.chromeThemeColorsSettingDescriptor);

      updateHostConfig({userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

      chromeThemeColorsSetting.set(false);
      themeSupport.fetchColorsAndApplyHostTheme();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));

      // Also verify in non-hosted mode starting from an active baseline-default theme.
      chromeThemeColorsSetting.set(true);
      isHostedModeStub.returns(false);
      themeSupport.fetchColorsAndApplyHostTheme();
      const initialLink = getLatestColorsLink();
      initialLink.onload!(new Event('load'));
      await Promise.resolve();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));

      chromeThemeColorsSetting.set(false);
      themeSupport.fetchColorsAndApplyHostTheme();
      const links = document.body.querySelectorAll<HTMLLinkElement>(COLORS_CSS_SELECTOR);
      const latestLink = links[links.length - 1];
      if (latestLink && latestLink !== initialLink && latestLink.onload) {
        latestLink.onload(new Event('load'));
      }
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('clears baseline-default and forces baseline-grayscale when hostConfig.isOffTheRecord is true', async () => {
      const isHostedModeStub =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(true);

      updateHostConfig({userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

      updateHostConfig({isOffTheRecord: true, userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));

      // Also verify in non-hosted mode starting from an active baseline-default theme.
      isHostedModeStub.returns(false);
      updateHostConfig({isOffTheRecord: false, userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();
      const initialLink = getLatestColorsLink();
      initialLink.onload!(new Event('load'));
      await Promise.resolve();
      assert.isTrue(document.documentElement.classList.contains('baseline-default'));

      updateHostConfig({isOffTheRecord: true, userColorSource: 'baseline-default'});
      themeSupport.fetchColorsAndApplyHostTheme();
      const latestLink = getLatestColorsLink();
      assert.notStrictEqual(latestLink, initialLink);
      latestLink.onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));
    });

    it('falls back to --user-color-source CSS property when hostConfig and event payload are undefined', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
      const style = document.createElement('style');
      style.textContent = 'body { --user-color-source: baseline-default; }';
      document.head.appendChild(style);
      injectedElements.push(style);

      dispatchColorThemeChanged(undefined);
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      assert.isTrue(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));

      style.textContent = 'body { --user-color-source: baseline-grayscale; }';
      dispatchColorThemeChanged(undefined);
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isTrue(document.documentElement.classList.contains('baseline-grayscale'));

      style.textContent = 'body {}';
      dispatchColorThemeChanged(undefined);
      getLatestColorsLink().onload!(new Event('load'));
      await Promise.resolve();

      assert.isFalse(document.documentElement.classList.contains('baseline-default'));
      assert.isFalse(document.documentElement.classList.contains('baseline-grayscale'));
    });
  });

  describe('getComputedValue', () => {
    class StyledComponent extends HTMLElement {
      #shadow = this.attachShadow({mode: 'open'});

      constructor() {
        super();

        this.#shadow.innerHTML = `<style>
          :host {
            --color-primary-old: red;
          }
          </style>`;
      }
    }

    before(() => {
      customElements.define('test-styled-component', StyledComponent);
    });

    it('obtains computed values correctly (document)', () => {
      assert.isNotEmpty(themeSupport.getComputedValue('--color-primary-old'));
    });

    it('obtains computed values correctly (element)', () => {
      const element = new StyledComponent();
      renderElementIntoDOM(element);

      const documentValue = themeSupport.getComputedValue('--color-primary-old');
      const elementValue = themeSupport.getComputedValue('--color-primary-old', element);
      assert.isNotEmpty(elementValue);
      assert.notStrictEqual(documentValue, elementValue);
    });

    it('caches computed values (document)', () => {
      const documentValue = themeSupport.getComputedValue('--color-primary-old');

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --color-primary-old: green; }';
      document.head.appendChild(newStyle);

      const updatedDocumentValue = themeSupport.getComputedValue('--color-primary-old');
      newStyle.remove();

      assert.strictEqual(documentValue, updatedDocumentValue);
    });

    it('caches computed values (element)', () => {
      const element = new StyledComponent();
      renderElementIntoDOM(element);

      const elementValue = themeSupport.getComputedValue('--color-primary-old', element);
      assert.isNotEmpty(elementValue);

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --color-primary-old: green; }';

      element.shadowRoot!.appendChild(newStyle);
      const updatedElementValue = themeSupport.getComputedValue('--color-primary-old', element);

      assert.strictEqual(elementValue, updatedElementValue);
    });

    it('does not caches empty computed values (element)', () => {
      const documentValue = themeSupport.getComputedValue('--test-value');

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --test-value: green; }';
      document.head.appendChild(newStyle);

      const updatedDocumentValue = themeSupport.getComputedValue('--test-value', document.body);
      newStyle.remove();

      assert.isEmpty(documentValue);
      assert.isNotEmpty(updatedDocumentValue);
      assert.notStrictEqual(documentValue, updatedDocumentValue);
    });
  });

  describe('tokens', () => {
    afterEach(() => {
      document.documentElement.classList.remove('theme-with-dark-background');
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    it('resolves --color-continue-to-location-async-hover to --ref-palette-green40 in dark theme', () => {
      document.documentElement.classList.add('theme-with-dark-background');
      const element = document.createElement('div');
      element.style.backgroundColor = 'var(--color-continue-to-location-async-hover)';
      renderElementIntoDOM(element);

      const computedBackgroundColor = window.getComputedStyle(element).backgroundColor;
      assert.strictEqual(computedBackgroundColor, 'rgb(20, 108, 46)');
    });
  });
});
