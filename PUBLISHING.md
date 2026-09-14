# Publishing Effect Pause on GitHub

This repository includes a GitHub Actions workflow that builds Foundry-ready release assets automatically.

## First upload

1. Create a new **public** GitHub repository. Recommended name: `effect-pause`.
2. Do not initialize the repository with a README, license, or `.gitignore` if you are uploading this prepared folder.
3. Put the contents of this folder at the repository root. `module.json` must be directly in the root.
4. Commit and push the files, for example with the commit message:
   `Initial release v0.2.0`
5. Open **Releases → Draft a new release** on GitHub.
6. Create/select the tag `v0.2.0` from the main branch.
7. Title the release `Effect Pause v0.2.0` and publish it.
8. The `Build Foundry Release` workflow will attach two assets automatically:
   - `module.json`
   - `effect-pause.zip`

The release workflow reads the GitHub repository name automatically, so no GitHub username or repository URL has to be hard-coded into the source manifest.

## Stable installation manifest

After the first release, the stable URL for users is:

`https://github.com/OWNER/REPOSITORY/releases/latest/download/module.json`

For a Foundry package-directory version entry, use the version-specific manifest URL instead:

`https://github.com/OWNER/REPOSITORY/releases/download/v0.2.0/module.json`

## Future releases

1. Update `version` in `module.json`, for example to `0.2.1`.
2. Update `CHANGELOG.md`.
3. Commit and push.
4. Create a GitHub release whose tag matches the manifest version with a leading `v`, for example `v0.2.1`.
5. The workflow validates that the tag and manifest version match, then builds and uploads the release assets.

Do not manually edit the generated release `module.json`. It contains repository-specific `url`, `manifest`, `download`, `bugs`, and `changelog` URLs injected by the workflow.
