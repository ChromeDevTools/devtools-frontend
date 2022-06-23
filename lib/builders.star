# Copyright 2022 the V8 project authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

AUTOROLLER_ACCOUNT = "devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com"

defaults = struct(
    cipd_package = "infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build",
    cipd_version = "refs/heads/main",
    swarming_tags = ["vpython:native-python-wrapper"],
    repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
    favicon = "https://storage.googleapis.com/chrome-infra-public/logo/devtools.png",

    # Forward on luci.builder.defaults so users have a consistent interface
    **{a: getattr(luci.builder.defaults, a) for a in dir(luci.builder.defaults)}
)

goma_rbe_prod_default = {
    "$build/goma": {
        "server_host": "goma.chromium.org",
        "rpc_extra_params": "?prod",
        "use_luci_auth": True,
    },
}

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
    win10 = {
        "cpu": "x86-64",
        "os": "Windows-10",
    },
    mac = {
        "cpu": "x86-64",
        "os": "Mac",
    },
)

default_timeout = 45 * time.minute

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
    properties.update(goma_rbe_prod_default)
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

    return builder(**kwargs)

os_dimensions = {
    "linux": dimensions.default_ubuntu,
    "win64": dimensions.win10,
    "mac": dimensions.mac,
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
        excluded_from = [],
        notification_muted = False,
        properties = None,
        execution_timeout = default_timeout,
        description_html = None):
    return struct(
        name = name,
        recipe_name = recipe_name,
        dims = dims,
        excluded_from = excluded_from,
        notification_muted = notification_muted,
        properties = properties,
        execution_timeout = execution_timeout,
        description_html = description_html,
    )

def generate_ci_configs(configurations, builders):
    # Generate full configuration for ci builders:
    #   bucket, builders, console, scheduler.
    # Arguments:
    #   - configurations: [] of config_section
    #   - builders: [] of builder_descriptor

    SERVICE_ACCOUNT = "devtools-frontend-ci-builder@chops-service-accounts.iam.gserviceaccount.com"

    luci.bucket(
        name = "ci",
        acls = [
            acls.readers,
            acl.entry(
                roles = acl.BUILDBUCKET_TRIGGERER,
                users = [
                    SERVICE_ACCOUNT,
                    "luci-scheduler@appspot.gserviceaccount.com",
                ],
            ),
        ],
    )

    all_builder_refs = []
    for c in configurations:
        builders_refs = []

        def ci_builder(**kwargs):
            category = kwargs.pop("console_category")
            properties = kwargs.pop("properties")
            properties.update(goma_rbe_prod_default)
            builder(
                bucket = "ci",
                builder_group = c.builder_group,
                service_account = SERVICE_ACCOUNT,
                schedule = "triggered",
                properties = properties,
                **kwargs
            )
            builders_refs.append((kwargs["name"], category))

        for b in builders:
            if c.name not in b.excluded_from:
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
            triggers = [name for name, _ in builders_refs],
        )

target_config = {
    "solution_name": "devtools-frontend",
    "project_name": "devtools/devtools-frontend",
    "account": AUTOROLLER_ACCOUNT,
    "log_template": "Rolling %s: %s/+log/%s..%s",
    "cipd_log_template": "Rolling %s: %s..%s",
}

def get_roller_names(builder_group_definitions):
    names = []
    for builder_group in builder_group_definitions:
        for builder_definition in builder_group.get("builders"):
            names.append(builder_definition["name"])
    return names

def generate_devtools_frontend_rollers(builder_group_definitions):
    for builder_group in builder_group_definitions:
        for builder_definition in builder_group.get("builders"):
            builder_properties = {
                "autoroller_config": {
                    "target_config": target_config,
                    "subject": builder_definition["subject"],
                    "includes": builder_definition.get("includes"),
                    "excludes": builder_definition.get("excludes"),
                    "reviewers": [
                        "machenbach@chromium.org",
                        "liviurau@chromium.org",
                    ],
                    "show_commit_log": builder_definition.get("show_commit_log", False),
                },
                "skip_untrusted_origins": builder_group.get("skip_untrusted_origins", False),
                "skip_chromium_deps": builder_group.get("skip_chromium_deps", False),
                "disable_bot_commit": builder_group.get("disable_bot_commit", False),
                # "Bug: none" is required for presubmit
                "bugs": "none",
            }

            highly_privileged_builder(
                name = builder_definition["name"],
                bucket = "ci",
                service_account = AUTOROLLER_ACCOUNT,
                schedule = "0 3,12 * * *",
                recipe_name = "v8/auto_roll_v8_deps",
                dimensions = dimensions.default_ubuntu,
                execution_timeout = default_timeout,
                properties = builder_properties,
                notifies = ["autoroll sheriff notifier"],
            )

cq_acls = [
    acl.entry(
        [acl.CQ_COMMITTER],
        groups = ["project-devtools-committers"],
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
