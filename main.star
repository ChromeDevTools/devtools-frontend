#!/usr/bin/env -S bash -xc 'lucicfg format && lucicfg "$0"'

lucicfg.check_version("1.29.1", "Please update depot_tools")

# Launch 100% of Swarming tasks for builds in "realms-aware mode"
luci.builder.defaults.experiments.set({"luci.use_realms": 100})

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

## Swarming permissions

# Allow admins to use LED and "Debug" button on every V8 builder and bot.
luci.binding(
    realm = "@root",
    roles = "role/swarming.poolUser",
    groups = "mdb/v8-infra",
)
luci.binding(
    realm = "@root",
    roles = "role/swarming.taskTriggerer",
    groups = "mdb/v8-infra",
)

# Allow cria/project-v8-led-users to use LED and "Debug" button on
# try and ci builders
def led_users(*, pool_realm, builder_realms, groups):
    luci.realm(
        name = pool_realm,
        bindings = [luci.binding(
            realm = pool_realm,
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

led_users(
    pool_realm = "pools/ci",
    builder_realms = ["ci"],
    groups = "project-devtools-admins",
)

led_users(
    pool_realm = "pools/try",
    builder_realms = ["try"],
    groups = "project-devtools-admins",
)

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
        "Previous roll failed",
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
exec("//buckets/try.star")
exec("//buckets/serving_app.star")
