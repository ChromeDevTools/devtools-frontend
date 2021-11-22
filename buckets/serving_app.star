load(
    "//lib/builders.star",
    "builder",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
)

builder(
    name = "serving_app_presubmit",
    bucket = "try",
    builder_group = "tryserver.devtools-frontend",
    recipe_name = "run_presubmit",
    dimensions = dimensions.default_ubuntu,
    properties = {
        "runhooks": True,
    },
    priority = 25,
    execution_timeout = 5 * time.minute,
    service_account = "devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com",
)

luci.list_view(
    name = "serving app tryserver",
    title = "Serving App Tryserver",
    favicon = defaults.favicon,
    entries = ["serving_app_presubmit"],
)

luci.cq_group(
    name = "serving_app",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/chromium/tools/chrome-devtools-frontend",
        refs = ["refs/heads/main"],
    ),
    acls = cq_acls,
    retry_config = cq_retry_config,
    verifiers = [
        luci.cq_tryjob_verifier(builder = "serving_app_presubmit", disable_reuse = True),
    ],
)
