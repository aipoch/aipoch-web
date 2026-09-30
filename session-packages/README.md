# Session package sources

Drop exported open-science session packages (`.science`) here, named after the
case slug you want in the URL:

```
session-packages/<slug>.science
```

`<slug>` must be lowercase letters, digits, and dashes — it becomes
`/open-science/use-cases/<slug>`. Then import everything:

```bash
bun run scripts/import-session-package.ts
```

The importer rewrites `data/use-cases/` and `public/use-cases/` from these
sources; re-run it after replacing or adding a file. The `.science` files
themselves are gitignored — only the imported output is committed.

## Extra showcase files

Files dropped in `session-packages/<slug>.extra/` are bundled into that case
as additional assets (pinned to the last assistant message's artifact gallery)
on every import. Use this for demo attachments that are not part of the
original export — they survive re-imports.
