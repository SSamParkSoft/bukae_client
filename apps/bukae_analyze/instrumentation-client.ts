// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
