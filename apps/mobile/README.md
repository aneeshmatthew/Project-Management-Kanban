# apps/mobile (placeholder)

This app is intentionally not scaffolded yet — the project is web-only for
now. When mobile work starts:

1. `npx create-expo-app@latest . --template` inside this directory
2. Add `@repo/api` and `@repo/ui`-compatible primitives as dependencies
   (note: `packages/ui` currently targets DOM elements via Tailwind/CVA —
   a React Native-compatible variant, e.g. using NativeWind, would live
   alongside it rather than replace it)
3. Point the tRPC client at the same `@repo/api` `AppRouter` type used by
   `apps/web` — that's the whole point of keeping this in the monorepo.
