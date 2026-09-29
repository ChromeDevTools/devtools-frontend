# How to contribute

We'd love to accept your patches and contributions to this project.

## Before you begin

### Sign our Contributor License Agreement

Contributions to this project must be accompanied by a
[Contributor License Agreement](https://cla.developers.google.com/about) (CLA).
You (or your employer) retain the copyright to your contribution; this simply
gives us permission to use and redistribute your contributions as part of the
project.

If you or your current employer have already signed the Google CLA (even if it
was for a different project), you probably don't need to do it again.

Visit <https://cla.developers.google.com/> to see your current agreements or to
sign a new one.

### Review our community guidelines

This project follows
[Google's Open Source Community Guidelines](https://opensource.google/conduct/).

## Contribution process

### Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

### Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/)
and [Release Please](https://github.com/googleapis/release-please) for automated
versioning and changelog generation.

PR titles and commit messages should follow the format:

* `feat: ...` for new features (triggers a `minor` version bump)
* `fix: ...` for bug fixes (triggers a `patch` version bump)
* `feat!: ...` or `fix!: ...` for breaking changes (triggers a `major` version bump)
* `docs: ...`, `chore: ...`, `ci: ...`, `test: ...` for maintenance changes