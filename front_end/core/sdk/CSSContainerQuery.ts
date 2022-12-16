// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import {type CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';
import {type DOMNode} from './DOMModel.js';

export class CSSContainerQuery extends CSSQuery {
  name?: string;
  physicalAxes?: Protocol.DOM.PhysicalAxes;
  logicalAxes?: Protocol.DOM.LogicalAxes;

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
  }

  active(): boolean {
    return true;
  }

  async getContainerForNode(nodeId: Protocol.DOM.NodeId): Promise<CSSContainerQueryContainer|undefined> {
    const containerNode =
        await this.cssModel.domModel().getContainerForNode(nodeId, this.name, this.physicalAxes, this.logicalAxes);
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
    const contain = styles.get('contain');
    const writingMode = styles.get('writing-mode');
    if (!containerType || !contain || !writingMode) {
      return;
    }

    // The final queried axes are the union of both properties.
    const queryAxis = getQueryAxis(`${containerType} ${contain}`);
    const physicalAxis = getPhysicalAxisFromQueryAxis(queryAxis, writingMode);
    let width, height;
    if (physicalAxis === PhysicalAxis.Both || physicalAxis === PhysicalAxis.Horizontal) {
      width = styles.get('width');
    }
    if (physicalAxis === PhysicalAxis.Both || physicalAxis === PhysicalAxis.Vertical) {
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

export const getQueryAxis = (propertyValue: string): QueryAxis => {
  const segments = propertyValue.split(' ');
  let isInline = false;
  let isBlock = false;
  for (const segment of segments) {
    if (segment === 'size') {
      return QueryAxis.Both;
    }
    isInline = isInline || segment === 'inline-size';
    isBlock = isBlock || segment === 'block-size';
  }

  if (isInline && isBlock) {
    return QueryAxis.Both;
  }
  if (isInline) {
    return QueryAxis.Inline;
  }
  if (isBlock) {
    return QueryAxis.Block;
  }

  return QueryAxis.None;
};

export const getPhysicalAxisFromQueryAxis = (queryAxis: QueryAxis, writingMode: string): PhysicalAxis => {
  const isVerticalWritingMode = writingMode.startsWith('vertical');
  switch (queryAxis) {
    case QueryAxis.None:
      return PhysicalAxis.None;
    case QueryAxis.Both:
      return PhysicalAxis.Both;
    case QueryAxis.Inline:
      return isVerticalWritingMode ? PhysicalAxis.Vertical : PhysicalAxis.Horizontal;
    case QueryAxis.Block:
      return isVerticalWritingMode ? PhysicalAxis.Horizontal : PhysicalAxis.Vertical;
  }
};

export interface ContainerQueriedSizeDetails {
  queryAxis: QueryAxis;
  physicalAxis: PhysicalAxis;
  width?: string;
  height?: string;
}

export const enum QueryAxis {
  None = '',
  Inline = 'inline-size',
  Block = 'block-size',
  Both = 'size',
}

export const enum PhysicalAxis {
  None = '',
  Horizontal = 'Horizontal',
  Vertical = 'Vertical',
  Both = 'Both',
}
