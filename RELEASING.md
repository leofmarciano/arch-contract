# Releasing arch-contract

Releases are **automated**. Publishing a GitHub Release triggers two workflows
that publish the package to both registries:

- [`publish-npm.yml`](.github/workflows/publish-npm.yml) → [npmjs](https://www.npmjs.com/package/arch-contract)
  as `arch-contract`, with npm provenance (SLSA attestation).
- [`publish-github-packages.yml`](.github/workflows/publish-github-packages.yml) →
  GitHub Packages as `@leofmarciano/arch-contract` (shows in the repo's Packages sidebar).

Both also run on `workflow_dispatch` so a single registry can be re-published
manually without cutting a new release.

## The version lives in three places — bump them together

`npm publish` ships whatever `package.json` says; the workflows do **not** derive
the version from the release tag (they only assert the two match — see below). A
release commit must update all three in lockstep:

1. `packages/arch-contract/package.json` → `"version"` (the published version).
2. `packages/arch-contract/src/index.ts` → `export const VERSION` (drives `arch-contract --version`).
3. `CHANGELOG.md` → move `## [Unreleased]` entries under a new `## [X.Y.Z] - <date>`
   heading, add a fresh empty `## [Unreleased]`, and update the compare links at
   the bottom.

A CI guard (`Verify package.json version matches the release tag`) fails the
publish if `package.json` and the release tag disagree, so a forgotten bump
cannot silently re-publish an old version.

## Cut a release

```bash
# 1. On a branch off main, bump the three version sites + finalize CHANGELOG.
# 2. Verify locally:
pnpm -r build
node packages/arch-contract/dist/cli.js --version      # must print the new version
pnpm install --frozen-lockfile                          # lockfile still valid
( cd packages/arch-contract && npm pack --dry-run )      # tarball = arch-contract-X.Y.Z.tgz, includes dist + README + LICENSE
pnpm -r test                                             # green

# 3. Open a PR, get CI green, merge to main.
# 4. Confirm main carries the bump, then cut the release (this triggers publish):
git fetch origin
git show origin/main:packages/arch-contract/package.json | grep '"version"'   # == X.Y.Z

# Release notes: either auto-generate from merged PRs (--generate-notes),
# or paste the CHANGELOG section for this version via --notes-file.
gh release create vX.Y.Z --target main --title "vX.Y.Z" --generate-notes
```

> The git tag **must** be `vX.Y.Z` and point at the commit that contains the
> bump. The release job checks out the tag, so tagging a pre-bump commit would
> re-ship the old version and fail.

## Secrets / tokens

- `NPM_TOKEN` — an npm **Automation** (or Granular) token that bypasses 2FA for
  writes. A classic token with "2FA required for publish" fails non-interactive
  publish with `EOTP`. (The current token works — `0.1.1` published with provenance.)
- `GITHUB_TOKEN` — provided automatically; the workflow grants it `packages: write`.

## Versioning

Pre-1.0 SemVer: backward-compatible additions bump the **minor** (`0.1.x → 0.2.0`);
bug fixes bump the **patch**. Breaking changes bump the minor while < 1.0 and are
called out in the CHANGELOG.
