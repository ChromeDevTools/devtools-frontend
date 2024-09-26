# Copyright 2022 the V8 project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

AUTOROLLER_ACCOUNT = "devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com"
CI_ACCOUNT = "devtools-frontend-ci-builder@chops-service-accounts.iam.gserviceaccount.com"
TRY_ACCOUNT = "devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com"

defaults = struct(
    cipd_package = "infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build",
    cipd_version = "refs/heads/main",
    swarming_tags = ["vpython:native-python-wrapper"],
    repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
    favicon = "https://storage.googleapis.com/chrome-infra-public/logo/devtools.png",

    # Forward on luci.builder.defaults so users have a consistent interface
    **{a: getattr(luci.builder.defaults, a) for a in dir(luci.builder.defaults)}
)

acls = struct(
    readers = acl.entry(
        roles = acl.BUILDBUCKET_READER,
        groups = "all",
    ),
)

dimensions = struct(
    ubuntu = {
        "os": "Ubuntu",
    },
    default_ubuntu = {
        "host_class": "default",
        "os": "Ubuntu",
    },
    beefy_ubuntu = {
        "host_class": "beefy",
        "os": "Ubuntu",
    },
    multibot = {
        "host_class": "multibot",
    },
    win10 = {
        "cpu": "x86-64",
        "os": "Windows-10",
    },
    mac = {
        "cpu": "x86-64",
        "os": "Mac",
    },
    mac_arm64 = {
        "cpu": "arm64",
        "os": "Mac",
    },
)

default_timeout = 60 * time.minute

def recipe(
        name,
        cipd_package = defaults.cipd_package,
        cipd_version = defaults.cipd_version):
    """Create recipe declaration with dtf defaults"""
    return luci.recipe(
        name = name,
        cipd_package = cipd_package,
        cipd_version = cipd_version,
        use_bbagent = True,
        use_python3 = True,
    )

def builder(
        recipe_name,
        swarming_tags = defaults.swarming_tags,
        **kwargs):
    """Create builder with dtf defaults"""
    builder_group = kwargs.pop("builder_group", None)

    properties = dict(kwargs.pop("properties", {}))
    if builder_group:
        properties.update(builder_group = builder_group)
    properties["$recipe_engine/isolated"] = {
        "server": "https://isolateserver.appspot.com",
    }
    kwargs["properties"] = properties

    kwargs["executable"] = recipe(recipe_name)
    kwargs["resultdb_settings"] = resultdb.settings(enable = True)
    experiments = None
    if recipe_name in ["chromium_integration", "chromium_trybot"]:
        experiments = {
            "chromium.chromium_tests.use_rdb_results": 100,
        }
    luci.builder(
        swarming_tags = swarming_tags,
        experiments = experiments,
        **kwargs
    )

def highly_privileged_builder(**kwargs):
    dimensions = dict(kwargs.pop("dimensions", {}))
    dimensions["pool"] = "luci.v8.highly-privileged"
    kwargs["dimensions"] = dimensions
    kwargs["bucket"] = "ci-hp"

    return builder(**kwargs)

os_dimensions = {
    "linux": dimensions.default_ubuntu,
    "win64": dimensions.win10,
    "mac": dimensions.mac,
    "mac_arm64": dimensions.mac_arm64,
}

def builder_coverage(covered_oss, builder_factory, builder_name_pattern, **kwargs):
    for os in covered_oss:
        builder_factory(
            dimensions = os_dimensions[os],
            name = builder_name_pattern % os,
            **kwargs
        )

def config_section(
        name,
        branch,
        branch_number = None,
        view = None,
        name_suffix = None,
        builder_group = "client.devtools-frontend.integration",
        repo = defaults.repo,
        notifiers = [],
        priority = None):
    view = view or name.capitalize()
    if name_suffix == None:
        name_suffix = " %s" % name
    return struct(
        name = name,
        branch = branch,
        branch_number = branch_number,
        repo = repo,
        view = view,
        name_suffix = name_suffix,
        builder_group = builder_group,
        notifiers = notifiers,
        priority = priority,
    )

def builder_descriptor(
        name,
        recipe_name,
        dims = dimensions.default_ubuntu,
        consoles = [],
        notification_muted = False,
        properties = None,
        execution_timeout = default_timeout,
        description_html = None):
    return struct(
        name = name,
        recipe_name = recipe_name,
        dims = dims,
        consoles = consoles,
        notification_muted = notification_muted,
        properties = properties,
        execution_timeout = execution_timeout,
        description_html = description_html,
    )

def bucket(
        name,
        acls,
        led_service_accounts = None,
        self_shadow = True,
        builders_can_led_trigger = False):
    extra_led_users = None
    if builders_can_led_trigger and led_service_accounts:
        extra_led_users = led_service_accounts
    luci.bucket(
        name = name,
        acls = acls,
        bindings = [
            luci.binding(
                roles = "role/buildbucket.creator",
                groups = ["mdb/v8-infra"],
                users = extra_led_users,
            ),
        ],
        shadows = name if self_shadow else None,
        constraints = shadow_constraints(
            name,
            led_service_accounts,
        ) if self_shadow and led_service_accounts else None,
    )

def shadow_constraints(pool_name, service_accounts):
    return luci.bucket_constraints(
        pools = ["pool/%s" % pool_name],
        service_accounts = service_accounts,
    )

def generate_ci_configs(configurations, builders):
    # Generate full configuration for ci builders:
    #   bucket, builders, console, scheduler.
    # Arguments:
    #   - configurations: [] of config_section
    #   - builders: [] of builder_descriptor

    bucket(
        name = "ci",
        acls = [
            acls.readers,
            acl.entry(
                roles = acl.BUILDBUCKET_TRIGGERER,
                users = [
                    CI_ACCOUNT,
                    "luci-scheduler@appspot.gserviceaccount.com",
                ],
            ),
        ],
        self_shadow = False,
    )

    luci.bucket(
        name = "ci.shadow",
        shadows = "ci",
        constraints = shadow_constraints("ci", [CI_ACCOUNT]),
        bindings = [
            luci.binding(
                roles = "role/buildbucket.creator",
                groups = ["mdb/v8-infra"],
            ),
        ],
        dynamic = True,
    )

    all_builder_refs = []
    for c in configurations:
        builders_refs = []

        def ci_builder(**kwargs):
            category = kwargs.pop("console_category")
            properties = kwargs.pop("properties")
            properties["$build/reclient"] = {
                "instance": "rbe-chromium-trusted",
                "metrics_project": "chromium-reclient-metrics",
            }
            builder(
                bucket = "ci",
                builder_group = c.builder_group,
                service_account = CI_ACCOUNT,
                schedule = "triggered",
                properties = properties,
                **kwargs
            )
            builders_refs.append((kwargs["name"], category))

        for b in builders:
            if c.name in b.consoles:
                properties = b.properties or {}
                if c.branch_number:
                    properties["branch_number"] = c.branch_number
                ci_builder(
                    name = b.name + c.name_suffix,
                    recipe_name = b.recipe_name,
                    dimensions = b.dims,
                    execution_timeout = b.execution_timeout,
                    console_category = "Linux",
                    notifies = [] if b.notification_muted else c.notifiers,
                    properties = b.properties or {},
                    priority = c.priority,
                    description_html = b.description_html,
                )

        luci.console_view(
            name = c.view.lower(),
            title = c.view,
            repo = c.repo,
            refs = [c.branch],
            favicon = defaults.favicon,
            header = {
                "tree_status_host": "devtools-status.appspot.com",
            },
            entries = [
                luci.console_view_entry(builder = name, category = category)
                for name, category in builders_refs
            ],
        )

        luci.gitiles_poller(
            name = "devtools-frontend-trigger-" + c.name,
            bucket = "ci",
            repo = c.repo,
            refs = [c.branch],
            path_regexps = [".+"],
            path_regexps_exclude = [
                "docs/.+",
                ".+\\.md",
            ],
            triggers = [name for name, _ in builders_refs],
        )

cq_acls = [
    acl.entry(
        [acl.CQ_COMMITTER],
        groups = ["project-devtools-submit-access"],
    ),
    acl.entry(
        [acl.CQ_DRY_RUNNER],
        groups = ["project-devtools-tryjob-access"],
    ),
]

cq_retry_config = cq.retry_config(
    single_quota = 2,
    global_quota = 4,
    failure_weight = 2,
    transient_failure_weight = 1,
    timeout_weight = 4,
)
