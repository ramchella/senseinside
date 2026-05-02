# Changesets

This directory holds version-bump intents managed by [Changesets](https://github.com/changesets/changesets). All three packages (`@senseinside/core`, `@senseinside/hook`, `@senseinside/cli`) are versioned together (`fixed`).

## Adding a changeset

```bash
npx changeset
```

## Versioning + publishing

```bash
npx changeset version   # rewrites package.json files
npm install             # refreshes lockfile
npx changeset publish   # publishes to npm (requires NPM_TOKEN)
```
