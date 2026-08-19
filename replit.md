# GoldAce Sticker Pack

Creates a polished Telegram animated sticker pack from the GoldAce assets and
uploads the finished five-sticker set under the title “GoldAce Sticker Pack.”

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Telegram upload API
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the clean sticker preview
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required secret: `TELEGRAM_BOT_TOKEN`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mockup-sandbox/public/images/goldace/` — clean Lottie JSON source
- `artifacts/mockup-sandbox/src/components/mockups/goldace-stickers/GoldAce.tsx` — preview and publish control
- `artifacts/api-server/src/routes/sticker-pack.ts` — TGS conversion and Telegram Bot API upload

## Architecture decisions

- The source animations are cleaned before preview and upload, not just visually covered in the UI.
- Telegram receives gzipped Lottie JSON as animated `.tgs` files.
- The user-facing pack title is `GoldAce Sticker Pack`; Telegram's required short name is derived from the bot username.

## Product

The preview shows the five finished animations and publishes them as a Telegram
sticker pack named `GoldAce Sticker Pack`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Telegram identifies the pack owner from the most recent bot update, so the owner
  must send `/start` to the bot before publishing.
- If the pack already exists, publishing replaces its current stickers with the
  clean versions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
