# Copyright 2022 the V8 project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

load(
    "//lib/builders.star",
    "AUTOROLLER_ACCOUNT",
    "acls",
    "bucket",
    "default_timeout",
    "defaults",
    "dimensions",
    "highly_privileged_builder",
    "recipe",
)

ROLL_BUILDER_NAME = "Roll deps and chromium pin into devtools-frontend"

bucket(
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
    led_service_accounts = [AUTOROLLER_ACCOUNT],
)

# Roll all dependencies (except of excluded ones) into devtools-frontend
highly_privileged_builder(
    name = ROLL_BUILDER_NAME,
    service_account = AUTOROLLER_ACCOUNT,
    schedule = "0 3,12 * * *",
    recipe_name = "devtools/auto_roll_incoming",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = default_timeout,
    notifies = [
        "autoroll sheriff notifier",
        "autoroll deps look up notifier",
    ],
)

MOJOJS_ROLLER_NAME = "Sync mojojs.zip config"

# Roll mojojs.zip config from chromium to src-internal
luci.builder(
    name = MOJOJS_ROLLER_NAME,
    bucket = "ci-hp",
    service_account = AUTOROLLER_ACCOUNT,
    dimensions = {
        "pool": "luci.v8.highly-privileged",
        "host_class": "default",
        "os": "Ubuntu",
    },
    executable = recipe(
        name = "sync_mojojs_config",
        cipd_package = "infra_internal/recipe_bundles/chrome-internal.googlesource.com/chrome/tools/build_limited/scripts/slave",
    ),
    schedule = "0 3,12 * * *",
    build_numbers = True,
    execution_timeout = default_timeout,
)

luci.list_view(
    name = "infra",
    title = "Infra",
    favicon = defaults.favicon,
    entries = [
        luci.list_view_entry(builder = ROLL_BUILDER_NAME),
        luci.list_view_entry(builder = MOJOJS_ROLLER_NAME),
    ],
)
