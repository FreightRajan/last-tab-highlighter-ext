<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

<!-- OPENWIKI_MAINTENANCE:START -->

## OpenWiki maintenance for this repository

This repository uses agent-driven OpenWiki updates. No background update workflow is configured; the generic scheduled-workflow sentence in the generated OpenWiki block above does not describe this setup. See [OPENWIKI.md](OPENWIKI.md) for the pinned Codex/Claude integrations and setup.

After substantive source or behavior changes, invoke the installed OpenWiki skill in **update** mode during the same session. Resolve the exact Git root, follow `openwiki_begin` and its returned plan/page queue, submit grounded claims, and call `openwiki_finish` after the queue completes. Report the wiki current only after finish returns `complete` or begin returns `noop`. If the tools are unavailable or a run is interrupted, report the unfinished update rather than fabricating metadata.

Preserve all existing review, commit, push, and deployment rules. Updating the wiki does not authorize publication, production changes, or git hooks. Use normal update mode; re-initialization can generate a scheduled GitHub workflow, which must be reviewed and removed to preserve this setup. Do not enable automatic commits or publication.

<!-- OPENWIKI_MAINTENANCE:END -->
