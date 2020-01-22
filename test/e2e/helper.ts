// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';
import * as puppeteer from 'puppeteer';

interface BrowserAndPages {
  browser: puppeteer.Browser;
  target: puppeteer.Page;
  frontend: puppeteer.Page;
}

const targetPage = Symbol('TargetPage');
const frontEndPage = Symbol('DevToolsPage');
const browserInstance = Symbol('BrowserInstance');

export let resetPages: () => void;

/**
 * Because querySelector is unable to go through shadow roots, we take the opportunity
 * to collect all elements from everywhere in the page, and cache it for future requests.
 * This means that when we attempt to locate elements for the purposes of interactions,
 * we can use this flattened list rather than attempting querySelector dances.
 */
const collectAllElementsFromPage =
    async () => {
  const frontend: puppeteer.Page = global[frontEndPage];
  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  return frontend.evaluate(() => {
    const container = (self as any);
    if (container.__elements) {
      return container.__elements;
    }

    container.__elements = [];
    const collect = (root: HTMLElement|ShadowRoot = document.body) => {
      const walker = document.createTreeWalker(root);
      do {
        const currentNode = walker.currentNode as HTMLElement;
        if (currentNode.shadowRoot) {
          collect(currentNode.shadowRoot);
        }

        // Confirm that it is an HTMLElement before storing it.
        if ('classList' in currentNode) {
          container.__elements.push(currentNode);
        }
      } while (walker.nextNode());
    }

    collect(document.documentElement);
  });
}

export async function getElementPosition({id, className}: {id?: string, className?: string}) {
  const frontend: puppeteer.Page = global[frontEndPage];

  if (!id && !className) {
    return null;
  }

  if (!frontend) {
    throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
  }

  // Make sure all elements are flattened in the target document.
  await collectAllElementsFromPage();

  return frontend.evaluate((targetId, targetClassName) => {
    const container = (self as any);
    if (!container.__elements) {
      return null;
    }

    const target = container.__elements.find(el => {
      if (el.id === targetId) {
        return el;
      }

      if (('classList' in el) && el.classList.contains(targetClassName)) {
        return el;
      }
    });

    if (!target) {
      return null;
    }

    // Extract the location values.
    const {left, top, width, height} = target.getBoundingClientRect();
    return {x: left + width * 0.5, y: top + height * 0.5,};
  }, id, className);
}

// TODO: Move to globalThis when Chromium updates its version of node
export function store(browser, target, frontend, reset) {
  global[browserInstance] = browser;
  global[targetPage] = target;
  global[frontEndPage] = frontend;
  resetPages = reset;
}

export function
getBrowserAndPages():
    BrowserAndPages {
      if (!global[targetPage]) {
        throw new Error('Unable to locate target page. Was it stored first?');
      }

      if (!global[frontEndPage]) {
        throw new Error('Unable to locate DevTools frontend page. Was it stored first?');
      }

      if (!global[browserInstance]) {
        throw new Error('Unable to locate browser instance. Was it stored first?');
      }

      return {
        browser: global[browserInstance], target: global[targetPage], frontend: global[frontEndPage],
      };
    }

export const resourcesPath = `file://${join(__dirname, 'resources')}`;
