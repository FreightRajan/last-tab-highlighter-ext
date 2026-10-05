# OpenWiki repository assistant

This repository includes OpenWiki **0.7.0** for Codex and Claude Code. The coding agent researches and writes the documentation using its existing model and authentication. This integration does not need a separate OpenWiki model-provider API key. The MCP server manages retrieval, the page queue, evidence claims, and generated metadata.

## Open the repository

Use a Git checkout and **Node.js 22.22.0 or newer** with npm/npx available to the coding agent. Restart or reopen Codex or Claude Code after pulling the integration files. Enable the repository MCP configuration if the host asks you to trust it.

The repository configuration starts the pinned package automatically:

| Host | Configuration | Skill |
| --- | --- | --- |
| Codex | `.codex/config.toml` | `.agents/skills/openwiki/SKILL.md` |
| Claude Code | `.mcp.json` | `.claude/skills/openwiki/SKILL.md` |

The MCP commands use `npx --yes openwiki@0.7.0 mcp --host codex` or `--host claude`. The first run may download the package. No global OpenWiki installation or application dependency change is required. Each skill is the unmodified upstream bundle with its installer-managed receipt.

Before the first agent session, warm the package cache so downloading does not consume the host's MCP startup timeout:

```sh
npx --yes openwiki@0.7.0 --version
```

## Use it while working

Ask your agent to answer a concrete repository question using OpenWiki, or to update the wiki after implementing a change. Examples:

- “Use OpenWiki to explain where this feature is implemented and what tests cover it.”
- “Update this repository's OpenWiki from the current source and tests, and finish the update.”

Agents should retrieve only the relevant wiki sections when they help resolve a question, then verify consequential details against current source. Start with [the task map](openwiki/quickstart.md) when MCP retrieval is unavailable. Wiki prose is context; source, tests, and the repository's existing review rules remain authoritative.

## Keep documentation current

After substantive source or behavior changes, the agent should invoke the installed OpenWiki skill in update mode during the same work session. Resolve the exact Git root, call `openwiki_begin`, follow the returned plan/page queue, submit the assigned pages and grounded claims, and call `openwiki_finish` after the queue completes. Report success only when finish returns `complete`; a `noop` result means no update is needed.

OpenWiki owns its claim sidecars, indexes, provenance, and run metadata. Do not hand-create those files or claim that an unfinished run completed. If a run is interrupted, invoke the skill again to resume its persisted queue. If tools are unavailable, say the update is incomplete.

Never commit transient `openwiki/.run.json` state. Keep completed pages, evidence claims, page manifests, and `.last-update.json` under version control.

This setup uses **agent-driven maintenance**. No background scheduler, GitHub Actions update workflow, standalone model provider, or git hook is configured by this integration. Updates run when a supported coding agent works in the repository and follows the maintenance instructions; they do not run continuously after the session ends.

Use normal `update` mode for this existing wiki. OpenWiki's `init` mode can generate a scheduled workflow automatically; if re-initializing, review and remove that newly generated workflow to preserve this repository's agent-driven setup. Do not enable automatic commits or publication. A generic scheduled-workflow sentence in OpenWiki's generated agent block does not describe this repository's configuration.

Existing commit, review, push, and deployment requirements still apply. A wiki update does not authorize a release, production migration, application-provider change, or deployment.

## Source boundaries and installation status

`.openwikiignore` excludes local secrets and generated files from wiki research while retaining example environment templates. Keep credentials, real customer/personal data, and signed URLs out of documentation. Add project-specific exclusions when needed; do not use ignored paths as evidence.

From the checkout, inspect the managed integrations with:

```sh
npx --yes openwiki@0.7.0 integrations list --project .
```

The checked-in wiki and integration are repository-scoped. They do not install personal/global skills or change the app's runtime dependencies.

## Upstream attribution

The repository bundles the unmodified host-integration skill from [LangChain OpenWiki](https://github.com/langchain-ai/openwiki), npm version **0.7.0**. Its MIT notice is preserved in [OPENWIKI-LICENSE.txt](OPENWIKI-LICENSE.txt).
