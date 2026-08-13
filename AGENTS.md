# Fork Maintenance Rules

## Branch roles

- `main` is a mirror of `upstream/main`. Do not add fork-specific code, documentation, version changes, tags, or npm releases to it.
- `fork` contains fork-specific features and is the only branch used for npm releases.
- `origin` is this repository's GitHub fork. `upstream` is `https://github.com/koishi-shangxue-plugins/koishi-plugin-adapter-qq-crack.git`.

## Manual upstream sync

Before syncing, require a clean working tree. Update `main` manually:

```powershell
git switch main
git fetch upstream main
git reset --hard upstream/main
git push origin main --force-with-lease
```

Then update the release branch and validate it:

```powershell
git switch fork
git rebase main
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-8
yarn build adapter-qq-crack-vincentzyu-fork
git push origin fork --force-with-lease
```

Resolve rebase conflicts in `fork`; do not merge fork changes into `main`.

## Releases

- Release only from `fork` after a clean build.
- Update the package version and changelog on `fork`, commit them, create the matching Git tag, then publish to npm.
- Do not publish from `main`.

## Fork-specific configuration

- `autoStreamText` is a bitset with `私聊` and `群聊` options. Its default is `私聊`.
- The former boolean `autoStreamText` value is intentionally unsupported. Document this manual migration whenever changing the option.

## Build command

- This package is part of the Koishi Yarn workspace. Run builds from the workspace root with `yarn build adapter-qq-crack-vincentzyu-fork`.
- Do not use `npm exec tsc` from this package directory because the workspace contains the upstream checkout with the same package name and npm rejects the duplicate workspace.
