// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import rule from '../lib/enforce-custom-element-definitions-location.ts';

import {RuleTester} from './utils/RuleTester.ts';

// @ts-expect-error
const rootFrontendDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'front_end');

new RuleTester().run('enforce-custom-element-definitions-location', rule, {
  valid: [
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/ui/components/foo/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/nested/folder/Foo.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/performance/library/components/metrics/Metric.ts',
      options: [{rootFrontendDirectory}],
    },
    {
      code: 'class Foo extends OtherClass {}',
      filename: 'front_end/models/some/Model.ts',
      options: [{rootFrontendDirectory}],
    },
  ],
  invalid: [
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/IssuesPanel.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/models/bindings/Bindings.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory}],
    },
  ],
});
