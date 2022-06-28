# Copyright 2022 the DevTools project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# The following dependencies are trusted - if new deps are added, their projects
# need to be BCID L3 (http://go/bcid-ladder#level-3) compliant.
trusted_origin_deps = [
    # SKELETON: If new dependencies are added, uncomment the builder below as
    #           well.
]

# The following dependencies are not rolled automatically, but only if
# explicitly defined.
excluded_deps = trusted_origin_deps + [
    "third_party/esbuild:infra/3pp/tools/esbuild/${platform}",
]

incoming_roller_definitions = [
    # Chromium's pinned version
    {
        "roll_chromium_pin": True,
        "builders": [
            {
                "name": "Auto-roll - devtools chromium",
                "subject": "Update DevTools Chromium DEPS.",
                "includes": [],
                "schedule": "0 6 * * *",
            },
        ],
    },

    # Trusted versions (from chromium/src)
    # ...the rolled version is trusted by chromium/src and therefore trusted
    #    by devtools-frontend
    {
        "skip_chromium_deps": False,
        "skip_untrusted_origins": True,
        "disable_bot_commit": False,
        "builders": [
            {
                "name": "Auto-roll - trusted-versions highly-privileged",
                "subject": "Update DevTools DEPS (trusted-versions)",
                "excludes": excluded_deps,
                "schedule": "0 3,12 * * *",
            },
        ],
    },

    # Trusted origins (manually defined in the 'includes' section)
    # ...the origin project is BCID L3 compliant, and therefore all code is (and
    #    all new versions are) trusted.
    {
        "skip_chromium_deps": True,
        "skip_untrusted_origins": False,
        "disable_bot_commit": False,
        "builders": [
            # {
            #     "name": "Auto-roll - trusted-origins highly-privileged",
            #     "subject": "Update DevTools DEPS (trusted-origins)",
            #     "includes": trusted_origin_deps,
            # "schedule": "0 3,12 * * *",
            # },
        ],
    },

    # Untrusted - rolled dependencies are reviewed by a human
    {
        "skip_chromium_deps": True,
        "skip_untrusted_origins": False,
        "disable_bot_commit": True,
        "builders": [
            {
                "name": "Roll - untrusted",
                "subject": "Update DevTools DEPS (untrusted)",
                "excludes": excluded_deps,
                "schedule": "0 3,12 * * *",
            },
        ],
    },
]
