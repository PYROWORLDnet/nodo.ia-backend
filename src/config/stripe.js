const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    price: 0,
    features: [
      'Basic business profile',
      'Up to 3 listings',
      'Basic analytics',
      '3 highlight credits/month'
    ],
    limits: {
      listings: 3,
      highlightCredits: 3,
      patchColor: 'grey'
    }
  },
  smart: {
    name: 'Smart Plan',
    price: 29.99,
    stripePriceId: process.env.STRIPE_SMART_PRICE_ID || 'price_1OvXXXXXXXXXXXXXXXXXXXXX',
    features: [
      'Everything in Free',
      'Up to 10 listings',
      'Advanced analytics',
      '10 highlight credits/month',
      'Priority support'
    ],
    limits: {
      listings: 10,
      highlightCredits: 10,
      patchColor: 'blue'
    }
  },
  pro: {
    name: 'Pro Plan',
    price: 99.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1OvYYYYYYYYYYYYYYYYYYYYY',
    features: [
      'Everything in Smart',
      'Unlimited listings',
      'Full analytics suite',
      '30 highlight credits/month',
      'Premium support',
      'Custom branding'
    ],
    limits: {
      listings: -1, // unlimited
      highlightCredits: 30,
      patchColor: 'gold'
    }
  }
};

module.exports = {
  SUBSCRIPTION_PLANS,
  STRIPE_CONFIG: {
    apiVersion: '2023-10-16',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  }
}; 