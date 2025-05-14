require('dotenv').config();

console.log('Environment Check:');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : 'Missing');
if (process.env.STRIPE_WEBHOOK_SECRET) {
  console.log('Secret Length:', process.env.STRIPE_WEBHOOK_SECRET.length);
  console.log('Secret Prefix:', process.env.STRIPE_WEBHOOK_SECRET.substring(0, 5));
} 