// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {join} from 'node:path';

import rule from '../lib/enforce-custom-element-definitions-location.ts';

import {RuleTester} from './utils/RuleTester.ts';

const rootFrontendDirectory = join(import.meta.dirname, '..', '..', '..', 'front_end');

new RuleTester().run('enforce-custom-element-definitions-location', rule, {
  valid: [
    {
      name: 'allows definition in ui/kit',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/ui/kit/foo/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'allows definition in panels/issues/components',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'allows definition in nested components folder',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/nested/folder/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'allows definition in panels/performance/library/components',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/performance/library/components/metrics/Metric.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'allows non-HTMLElement class definitions',
      code: 'class Foo extends OtherClass {}',
      filename: 'front_end/models/some/Model.ts',
      options: [{rootFrontendDirectory}],
    },
  ],
  invalid: [
    {
      name: 'disallows definition directly in issues panel',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/IssuesPanel.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'disallows definition in models directory',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/models/bindings/Bindings.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'disallows definition directly in ui/components root',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/ui/components/Icon.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
    {
      name: 'disallows definition in single-file component folder',
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/ui/components/icon/Icon.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
  ],
});
