# Cloudflare deployment and pull-request checks

YourTab has two separate Cloudflare deployment integrations. Keep them distinct when investigating GitHub checks.

## Production website

The production frontend is the Cloudflare Pages project at https://yourtab.pages.dev. Its GitHub repository is `ponteraTV/Yourtab_website`, with `main` as the production branch. The Pages build uses:

- Build command: `corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter @vaultstream/web build`
- Output directory: `apps/web/out`

Do not disconnect, delete, or reconfigure this Pages project while troubleshooting legacy Workers checks.

## Legacy Workers

The older Workers named `yourtab` and `yourtab-website` are separate from the Pages production project. If these Workers are no longer meant to build from GitHub, their Git integration should be disconnected in each Worker’s **Settings → Builds** section. Do not delete the Workers or the Pages project merely to clear a historical check.

## Verifying a fresh pull request

1. Open the new pull request and wait for its checks to finish.
2. Confirm the **Cloudflare Pages** check is present and inspect its deployment result.
3. If a legacy **Workers Builds: yourtab** or **Workers Builds: yourtab-website** check appears, inspect that check's build details in Cloudflare. Disconnecting Git does not necessarily erase check results already recorded for an earlier commit.
4. Do not merge solely because a Pages preview deployed successfully. Review all required checks and the code diff first.

## Production safety

- Never commit production `.env` files, API credentials, or JWT secrets.
- Before deploying authentication changes to the API, verify that the server has a unique random `JWT_SECRET` of at least 32 characters. Do not paste the secret into GitHub issues, pull requests, or chat.
- A successful frontend build does not by itself verify API authentication, video uploads, or playback.
