const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    listing_limit: 3,
    highlight_credits: 3,
    features: [
      'Basic listing creation',
      'Basic analytics',
      'Email support',
      '3 highlight credits/month'
    ]
  },
  smart: {
    name: 'Smart Plan',
    listing_limit: 10,
    highlight_credits: 10,
    features: [
      'Everything in Free Plan',
      'Priority support',
      'Advanced analytics',
      'Featured listings',
      'Social media integration',
      '10 highlight credits/month'
    ]
  },
  pro: {
    name: 'Pro Plan',
    listing_limit: 30,
    highlight_credits: 30,
    features: [
      'Everything in Smart Plan',
      'Premium support',
      'Custom branding',
      'API access',
      'Multiple users',
      'Bulk listing management',
      '30 highlight credits/month'
    ]
  }
};

module.exports = {
  SUBSCRIPTION_PLANS
}; 