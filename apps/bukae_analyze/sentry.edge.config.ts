// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
  dsn: 'https://d4b30956d395a319f1d16b74d25fd5e9@o4511393344847872.ingest.us.sentry.io/4511393345568768',

  tracesSampleRate: isProduction ? 0.05 : 1,

  // Avoid sending user PII by default. Add explicit tags/context only after reviewing data sensitivity.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
})
