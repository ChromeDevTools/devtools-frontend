// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';
import type {DOMNode} from './DOMModel.js';

export class CSSContainerQuery extends CSSQuery {
  name?: string;
  physicalAxes?: Protocol.DOM.PhysicalAxes;
  logicalAxes?: Protocol.DOM.LogicalAxes;
  queriesScrollState?: boolean;

  static parseContainerQueriesPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSContainerQuery[]):
      CSSContainerQuery[] {
    return payload.map(cq => new CSSContainerQuery(cssModel, cq));
  }

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSContainerQuery) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSContainerQuery): void {
    this.text = payload.text;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    this.name = payload.name;
    this.physicalAxes = payload.physicalAxes;
    this.logicalAxes = payload.logicalAxes;
    this.queriesScrollState = payload.queriesScrollState;
  }

  active(): boolean {
    return true;
  }

  async getContainerForNode(nodeId: Protocol.DOM.NodeId): Promise<CSSContainerQueryContainer|undefined> {
    const containerNode = await this.cssModel.domModel().getContainerForNode(
        nodeId, this.name, this.physicalAxes, this.logicalAxes, this.queriesScrollState);
    if (!containerNode) {
      return;
    }
    return new CSSContainerQueryContainer(containerNode);
  }
}

export class CSSContainerQueryContainer {
  readonly containerNode: DOMNode;

  constructor(containerNode: DOMNode) {
    this.containerNode = containerNode;
  }

  async getContainerSizeDetails(): Promise<ContainerQueriedSizeDetails|undefined> {
    const styles = await this.containerNode.domModel().cssModel().getComputedStyle(this.containerNode.id);
    if (!styles) {
      return;
    }
    const containerType = styles.get('container-type');
    const writingMode = styles.get('writing-mode');
    if (!containerType || !writingMode) {
      return;
    }

    const queryAxis = getQueryAxisFromContainerType(`${containerType}`);
    const physicalAxis = getPhysicalAxisFromQueryAxis(queryAxis, writingMode);
    let width, height;
    if (physicalAxis === PhysicalAxis.BOTH || physicalAxis === PhysicalAxis.HORIZONTAL) {
      width = styles.get('width');
    }
    if (physicalAxis === PhysicalAxis.BOTH || physicalAxis === PhysicalAxis.VERTICAL) {
      height = styles.get('height');
    }

    return {
      queryAxis,
      physicalAxis,
      width,
      height,
    };
  }
}

export const getQueryAxisFromContainerType = (propertyValue: string): QueryAxis => {
  const segments = propertyValue.split(' ');
  let isInline = false;
  for (const segment of segments) {
    if (segment === 'size') {
      return QueryAxis.BOTH;
    }
    isInline = isInline || segment === 'inline-size';
  }
  if (isInline) {
    return QueryAxis.INLINE;
  }
  return QueryAxis.NONE;
};

export const getPhysicalAxisFromQueryAxis = (queryAxis: QueryAxis, writingMode: string): PhysicalAxis => {
  const isVerticalWritingMode = writingMode.startsWith('vertical');
  switch (queryAxis) {
    case QueryAxis.NONE:
      return PhysicalAxis.NONE;
    case QueryAxis.BOTH:
      return PhysicalAxis.BOTH;
    case QueryAxis.INLINE:
      return isVerticalWritingMode ? PhysicalAxis.VERTICAL : PhysicalAxis.HORIZONTAL;
    case QueryAxis.BLOCK:
      return isVerticalWritingMode ? PhysicalAxis.HORIZONTAL : PhysicalAxis.VERTICAL;
  }
};

export interface ContainerQueriedSizeDetails {
  queryAxis: QueryAxis;
  physicalAxis: PhysicalAxis;
  width?: string;
  height?: string;
}

export const enum QueryAxis {
  NONE = '',
  INLINE = 'inline-size',
  BLOCK = 'block-size',
  BOTH = 'size',
}

export const enum PhysicalAxis {
  NONE = '',
  HORIZONTAL = 'Horizontal',
  VERTICAL = 'Vertical',
  BOTH = 'Both',
}
