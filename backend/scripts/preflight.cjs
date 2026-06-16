const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_ORIGIN'];

function fail(message) {
  console.error(`Preflight error: ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`Preflight warning: ${message}`);
}

function isUrlLike(value) {
  return /^https?:\/\//i.test(value || '');
}

if (process.env.NODE_ENV === 'production') {
  for (const name of requiredInProduction) {
    if (!process.env[name]) {
      fail(`${name} is required in production.`);
    }
  }

  if ((process.env.JWT_SECRET || '').length < 32) {
    fail('JWT_SECRET must have at least 32 characters.');
  }

  if (isUrlLike(process.env.JWT_SECRET)) {
    fail('JWT_SECRET must be a random secret, not a website URL.');
  }

  for (const rawOrigin of process.env.FRONTEND_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean)) {
    try {
      const origin = new URL(rawOrigin);
      if (!['http:', 'https:'].includes(origin.protocol)) {
        fail('FRONTEND_ORIGIN must start with http:// or https://.');
      }
    } catch {
      fail('FRONTEND_ORIGIN must be a valid URL, for example https://app.example.com. Use commas for multiple origins.');
    }
  }

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
      fail('DATABASE_URL must start with postgresql://.');
    }
  } catch {
    fail('DATABASE_URL is invalid. If your database password has special characters, URL-encode it or use a simpler password.');
  }

  if (/[#/?[\]@:%]/.test(process.env.POSTGRES_PASSWORD || '')) {
    warn('POSTGRES_PASSWORD contains special URL characters. Prefer letters, numbers, underscore and hyphen, or define DATABASE_URL manually with URL-encoded password.');
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    warn('VAPID keys are empty. Desktop/mobile push notifications will not work until VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are configured.');
  }
}

console.log('Preflight ok.');
