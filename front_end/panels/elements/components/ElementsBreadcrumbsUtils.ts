// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';

import {type DOMNode} from './Helper.js';

const UIStrings = {
  /**
   * @description Text in Elements Breadcrumbs of the Elements panel. Indicates that a HTML element
   * is a text node, meaning it contains text only and no other HTML elements. Should be translatd.
   */
  text: '(text)',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/ElementsBreadcrumbsUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type UserScrollPosition = 'start'|'middle'|'end';

export interface Crumb {
  title: CrumbTitle;
  selected: boolean;
  node: DOMNode;
  originalNode: unknown;
}

export interface CrumbTitle {
  main: string;
  extras: {id?: string, classes?: string[]};
}

export const crumbsToRender = (crumbs: readonly DOMNode[], selectedNode: Readonly<DOMNode>|null): Crumb[] => {
  if (!selectedNode) {
    return [];
  }

  return crumbs
      .filter(crumb => {
        return crumb.nodeType !== Node.DOCUMENT_NODE;
      })
      .map(crumb => {
        return {
          title: determineElementTitle(crumb),
          selected: crumb.id === selectedNode.id,
          node: crumb,
          originalNode: crumb.legacyDomNode,
        };
      })
      .reverse();
};

const makeCrumbTitle = (main: string, extras = {}): CrumbTitle => {
  return {
    main,
    extras,
  };
};

export const determineElementTitle = (domNode: DOMNode): CrumbTitle => {
  switch (domNode.nodeType) {
    case Node.ELEMENT_NODE: {
      if (domNode.pseudoType) {
        return makeCrumbTitle('::' + domNode.pseudoType);
      }
      const crumbTitle = makeCrumbTitle(domNode.nodeNameNicelyCased);

      const id = domNode.getAttribute('id');
      if (id) {
        crumbTitle.extras.id = id;
      }

      const classAttribute = domNode.getAttribute('class');
      if (classAttribute) {
        const classes = new Set(classAttribute.split(/\s+/));
        crumbTitle.extras.classes = Array.from(classes);
      }

      return crumbTitle;
    }

    case Node.TEXT_NODE:
      return makeCrumbTitle(i18nString(UIStrings.text));
    case Node.COMMENT_NODE:
      return makeCrumbTitle('<!-->');
    case Node.DOCUMENT_TYPE_NODE:
      return makeCrumbTitle('<!doctype>');
    case Node.DOCUMENT_FRAGMENT_NODE:
      return makeCrumbTitle(domNode.shadowRootType ? '#shadow-root' : domNode.nodeNameNicelyCased);
    default:
      return makeCrumbTitle(domNode.nodeNameNicelyCased);
  }
};
