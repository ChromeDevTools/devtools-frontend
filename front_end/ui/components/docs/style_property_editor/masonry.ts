// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Elements from '../../../../panels/elements/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new Elements.StylePropertyEditor.MasonryEditor();

document.getElementById('container')?.appendChild(component);

const computedProperties = new Map([
  ['align-content', 'initial'],
  ['justify-content', 'normal'],
  ['align-items', 'normal'],
  ['justify-items', 'normal'],
]);

const originalComputedProperties = new Map(computedProperties);

const authoredProperties = new Map([
  ['justify-content', 'normal'],
]);

component.data = {
  computedProperties,
  authoredProperties,
};

component.addEventListener('propertyselected', (event: Elements.StylePropertyEditor.PropertySelectedEvent) => {
  authoredProperties.set(event.data.name, event.data.value);
  computedProperties.set(event.data.name, event.data.value);
  component.data = {
    computedProperties,
    authoredProperties,
  };
});

component.addEventListener('propertydeselected', (event: Elements.StylePropertyEditor.PropertyDeselectedEvent) => {
  authoredProperties.delete(event.data.name);
  computedProperties.set(event.data.name, originalComputedProperties.get(event.data.name) as string);
  component.data = {
    computedProperties,
    authoredProperties,
  };
});
