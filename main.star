#!/usr/bin/env -S bash -xc 'lucicfg format && lucicfg "$0"'

lucicfg.check_version("1.30.9", "Please update depot_tools")

# Use LUCI Scheduler BBv2 names and add Scheduler realms configs.
lucicfg.enable_experiment("crbug.com/1182002")

# Tell lucicfg what files it is allowed to touch
lucicfg.config(
    config_dir = "generated",
    tracked_files = [
        "commit-queue.cfg",
        "cr-buildbucket.cfg",
        "luci-logdog.cfg",
        "luci-milo.cfg",
        "luci-notify.cfg",
        "luci-notify/**/*",
        "luci-scheduler.cfg",
        "project.cfg",
        "realms.cfg",
    ],
    fail_on_warnings = True,
    lint_checks = ["none", "+formatting"],
)

luci.project(
    name = "devtools-frontend",
    buildbucket = "cr-buildbucket.appspot.com",
    logdog = "luci-logdog",
    milo = "luci-milo",
    notify = "luci-notify.appspot.com",
    scheduler = "luci-scheduler",
    swarming = "chromium-swarm.appspot.com",
    acls = [
        acl.entry(
            [
                acl.BUILDBUCKET_READER,
                acl.LOGDOG_READER,
                acl.PROJECT_CONFIGS_READER,
                acl.SCHEDULER_READER,
            ],
            groups = ["all"],
        ),
        acl.entry(
            [acl.SCHEDULER_OWNER],
            groups = [
                "project-devtools-sheriffs",
                "project-v8-admins",
            ],
        ),
        acl.entry(
            [acl.LOGDOG_WRITER],
            groups = ["luci-logdog-chromium-writers"],
        ),
    ],
    bindings = [
        luci.binding(
            roles = "role/configs.validator",
            users = [
                "devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com",
            ],
        ),
        luci.binding(
            roles = "role/swarming.poolOwner",
            groups = "mdb/v8-infra",
        ),
        luci.binding(
            roles = "role/swarming.poolViewer",
            groups = "all",
        ),
        # Allow any DevTools build to trigger a test ran under chromium-tester@
        # chrome-gold@ task service accounts.
        luci.binding(
            roles = "role/swarming.taskServiceAccount",
            users = [
                "chromium-tester@chops-service-accounts.iam.gserviceaccount.com",
                "chrome-gold@chops-service-accounts.iam.gserviceaccount.com",
            ],
        ),
    ],
)

## Swarming permissions (enable LED runs and "Debug" button)

# project-devtools-admins:            ci, try
# v8-infra:                           ci, try
# v8-infra-users-highly-privileged:   [all buckets]

def led_users(*, pool_realm, builder_realms, groups):
    luci.realm(
        name = pool_realm,
        bindings = [luci.binding(
            roles = "role/swarming.poolUser",
            groups = groups,
        )],
    )
    for br in builder_realms:
        luci.binding(
            realm = br,
            roles = "role/swarming.taskTriggerer",
            groups = groups,
        )

non_privileged_groups = [
    "project-devtools-admins",
    "mdb/v8-infra",
]

led_users(
    pool_realm = "pools/ci",
    builder_realms = ["ci"],
    groups = non_privileged_groups,
)

led_users(
    pool_realm = "pools/try",
    builder_realms = ["try"],
    groups = non_privileged_groups,
)

led_users(
    pool_realm = "@root",
    builder_realms = ["@root"],
    groups = "google/v8-infra-users-highly-privileged@twosync.google.com",
)

## Notifications

luci.notify(tree_closing_enabled = True)

EXCLUDED_STEPS = [
    "Failure reason",
    "steps",
    ".* \\(flakes\\)",
    ".* \\(retry shards with patch\\)",
    ".* \\(with patch\\)",
    ".* \\(without patch\\)",
]

luci.notifier(
    name = "devtools notifier",
    on_occurrence = ["FAILURE"],
    failed_step_regexp_exclude = [
        "bot_update",
        "isolate tests",
        "package build",
        "extract build",
        "cleanup_temp",
        "gsutil upload",
        "taskkill",
    ] + EXCLUDED_STEPS,
    notify_emails = ["liviurau@chromium.org", "devtools-waterfall-sheriff-onduty@grotations.appspotmail.com"],
)

luci.tree_closer(
    name = "devtools tree closer",
    tree_status_host = "devtools-status.appspot.com",
    failed_step_regexp_exclude = [
        "E2E tests",
        "Interactions",
    ] + EXCLUDED_STEPS,
)

luci.notifier(
    name = "autoroll sheriff notifier",
    on_occurrence = ["FAILURE", "SUCCESS"],
    failed_step_regexp = [
        ".*Previous roll failed",
    ],
    notify_emails = ["liviurau@google.com", "devtools-waterfall-sheriff-onduty@grotations.appspotmail.com"],
    template = luci.notifier_template(
        name = "sheriff_email",
        body = """Stuck auto-roller: {{.Build.Builder.Builder}} found a stale CL.

The autoroller may be stuck. Please check out <a href=\"https://chromium-review.googlesource.com/q/owner:devtools-ci-autoroll-builder%2540chops-service-accounts.iam.gserviceaccount.com\">roll CLs</a>, find the latest autoroll CL and investigate.

Builder {{.Build.Builder.Builder}} found stale CL at
<a href=\"https://ci.chromium.org/b/{{.Build.Id}}\">Build {{.Build.Number}}</a>
on `{{.Build.EndTime | time}}`
""",
    ),
)

luci.notifier(
    name = "autoroll deps look up notifier",
    on_occurrence = ["FAILURE", "SUCCESS"],
    failed_step_regexp = [
        ".*look up .*",
    ],
    notify_emails = ["alexschulze@google.com", "machenbach@google.com", "liviurau@google.com"],
    template = luci.notifier_template(
        name = "failed_deps_lookup_email",
        body = """Dependency Roller: {{.Build.Builder.Builder}} has not found a recent version

Builder {{.Build.Builder.Builder}} was not able to find a most recent dependency version at
<a href=\"https://ci.chromium.org/b/{{.Build.Id}}\">Build {{.Build.Number}}</a>
on `{{.Build.EndTime | time}}`
""",
    ),
)

luci.milo(
    logo = "https://storage.googleapis.com/chrome-infra-public/logo/devtools.svg",
)

luci.logdog(gs_bucket = "chromium-luci-logdog")

luci.cq(
    submit_max_burst = 1,
    submit_burst_delay = 60 * time.second,
    status_host = "chromium-cq-status.appspot.com",
)

exec("//buckets/ci.star")
exec("//buckets/ci-hp.star")
exec("//buckets/try.star")
exec("//buckets/serving_app.star")
