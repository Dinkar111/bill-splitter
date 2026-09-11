# SplitTab

Split group bills by what each person actually ordered — item-level splitting,
proportional discounts, VAT/service charge, multiple payers, and an automatic
minimum-transfer settlement. Real accounts (email + password) and multiple
groups with invite links, self-hosted per deployer on your own Supabase project.

**Start here: [SETUP.md](./SETUP.md)** — creating the Supabase project, enabling
sign-in, configuring env vars, and deploying to Vercel.

The calculation engine (`lib/calc.ts`) is a pure, framework-free module with its
own tests: `npx tsx lib/calc.test.ts`.
