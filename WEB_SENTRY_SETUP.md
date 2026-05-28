# Web Sentry Setup

The web app uses `@sentry/react` (not `@sentry/nextjs`) because the build
runs as a static export (`output: 'export'`). All Sentry init happens
client-side. Without `NEXT_PUBLIC_SENTRY_DSN` set, init is a no-op.

## Cloudflare Pages env vars

Add these in **Cloudflare Pages → cookoncall → Settings → Environment variables**:

| Variable | Value | Required? |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@sentry.io/...` | Yes (to enable) |
| `NEXT_PUBLIC_APP_ENV` | `production` | Optional (default: `production`) |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | Optional |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Optional (default: `0.1`) |

Re-deploy after adding the variables.

## Local

Add to `.env.local` (gitignored):

```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_APP_ENV=development
```

## What gets captured

- Any uncaught error in a React tree (via `ErrorBoundary` → `Sentry.captureException`)
- Any throw in an event handler
- Network errors from fetch breadcrumbs

## What is redacted

- `Authorization` / `Cookie` headers (stripped before send)
- Body fields: `password`, `otp`, `*_token`, `razorpay_signature`,
  `razorpay_payment_id`, `aadhaar_number`, `pan_number`, `account_number`
- Query string keys: `password`, `otp`, `token`, `*_token`
- User PII other than `id` (email / name / IP all wiped in `beforeSend`)

## Testing

Add a temporary button on a dev build:

```tsx
<button onClick={() => { throw new Error("Sentry test"); }}>Crash me</button>
```

Click it — within ~30 seconds the event should appear in your Sentry
project's Issues tab. Remove the button before merging.
