# Git hooks for kimai-aggregator

These hooks run frontend formatters automatically before a commit and stage any changes. They also trigger `cargo fmt` for the backend if available.

To enable the hooks in this repository, run from the repository root:

```
git config core.hooksPath .githooks
```

After that, commits will run the hooks defined in this folder. Make sure to run `npm install` once so `prettier` is available locally.
