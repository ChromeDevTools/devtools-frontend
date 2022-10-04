# Copyright 2022 the V8 project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

load(
    "//lib/builders.star",
    "AUTOROLLER_ACCOUNT",
    "acls",
    "default_timeout",
    "defaults",
    "dimensions",
    "highly_privileged_builder",
)

ROLL_BUILDER_NAME = "Roll deps and chromium pin into devtools-frontend"

luci.bucket(
    name = "ci-hp",
    acls = [
        acls.readers,
        acl.entry(
            roles = acl.BUILDBUCKET_TRIGGERER,
            users = [
                AUTOROLLER_ACCOUNT,
                "luci-scheduler@appspot.gserviceaccount.com",
            ],
        ),
    ],
)

# Roll all dependencies (except of excluded ones) into devtools-frontend
highly_privileged_builder(
    name = ROLL_BUILDER_NAME,
    service_account = AUTOROLLER_ACCOUNT,
    schedule = "0 3,12 * * *",
    recipe_name = "v8/auto_roll_incoming_deps",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = default_timeout,
    properties = {
        "autoroller_config": {
            "target_config": {
                "solution_name": "devtools-frontend",
                "project_name": "devtools/devtools-frontend",
                "account": AUTOROLLER_ACCOUNT,
                "log_template": "Rolling %s: %s/+log/%s..%s",
                "cipd_log_template": "Rolling %s: %s..%s",
            },
            "subject": "Update DevTools DEPS",
            "excludes": [
                "third_party/esbuild:infra/3pp/tools/esbuild/${platform}",
                "third_party/ninja:infra/3pp/tools/ninja/${platform}",
            ],
            "reviewers": [
                "devtools-waterfall-sheriff-onduty@grotations.appspotmail.com",
            ],
            "show_commit_log": False,
            "roll_chromium_pin": True,
            # "Bug: none" is required to pass presubmit tests
            "bugs": "none",
        },
    },
    notifies = [
        "autoroll sheriff notifier",
        "autoroll deps look up notifier",
    ],
)

luci.list_view(
    name = "infra",
    title = "Infra",
    favicon = defaults.favicon,
    entries = [
        luci.list_view_entry(builder = ROLL_BUILDER_NAME),
    ],
)
