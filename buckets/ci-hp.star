# Copyright 2022 the V8 project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

load("//configs/incoming_rollers.star", "incoming_roller_definitions")
load(
    "//lib/builders.star",
    "AUTOROLLER_ACCOUNT",
    "acls",
    "default_timeout",
    "defaults",
    "dimensions",
    "generate_devtools_frontend_rollers",
    "get_roller_names",
    "highly_privileged_builder",
)

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

generate_devtools_frontend_rollers(incoming_roller_definitions)

luci.list_view(
    name = "infra",
    title = "Infra",
    favicon = defaults.favicon,
    entries = [
        luci.list_view_entry(builder = name)
        for name in get_roller_names(incoming_roller_definitions)
    ],
)
