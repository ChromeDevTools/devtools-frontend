// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ARIAProperties from '../../generated/ARIAProperties.js';
export interface AttributeConfig {
  name: string;
  type: string;
  enum?: string[];
}
export interface RoleConfig {
  name: string;
}
export interface Config {
  attributes: AttributeConfig[];
  roles: RoleConfig[];
}

export class ARIAMetadata {
  private readonly attributes: Map<string, Attribute>;
  private roleNames: string[];
  constructor(config: Config|null) {
    this.attributes = new Map();
    this.roleNames = [];

    if (config) {
      this.initialize(config);
    }
  }

  private initialize(config: Config): void {
    const attributes = config['attributes'];

    const booleanEnum = ['true', 'false'];
    for (const attributeConfig of attributes) {
      if (attributeConfig.type === 'boolean') {
        attributeConfig.enum = booleanEnum;
      }
      this.attributes.set(attributeConfig.name, new Attribute(attributeConfig));
    }

    this.roleNames = config['roles'].map(roleConfig => roleConfig.name);
  }

  valuesForProperty(property: string): string[] {
    const attribute = this.attributes.get(property);
    if (attribute) {
      return attribute.getEnum();
    }

    if (property === 'role') {
      return this.roleNames;
    }

    return [];
  }
}

let instance: ARIAMetadata|undefined;

export function ariaMetadata(): ARIAMetadata {
  if (!instance) {
    instance = new ARIAMetadata(ARIAProperties.config as Config || null);
  }
  return instance;
}

export class Attribute {
  private readonly enum: string[];
  constructor(config: AttributeConfig) {
    this.enum = [];

    if (config.enum) {
      this.enum = config.enum;
    }
  }

  getEnum(): string[] {
    return this.enum;
  }
}
