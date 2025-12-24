# Git hooks for kimai-aggregator (deprecated)

Auto-formatting is now performed by GitHub Actions (`.github/workflows/auto-format.yml`).

If you have previously enabled local hooks for this repo, you can remove or ignore the `.githooks` folder.

To disable local hooks for this repository, run from the repository root:

```
git config --unset core.hooksPath
```

