-- Add verification token expiry column
ALTER TABLE businesses 
ADD COLUMN verification_token_expires TIMESTAMP;

-- Add any missing columns from the model
ALTER TABLE "Businesses" 
ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "patchColor" VARCHAR(50) DEFAULT 'grey',
ADD COLUMN IF NOT EXISTS "highlightCredits" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "freeListingLimit" INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS "proHighlightQuota" INTEGER DEFAULT 0;

-- Add constraints
ALTER TABLE "Businesses" 
ADD CONSTRAINT valid_subscription_status CHECK ("subscriptionStatus" IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
ADD CONSTRAINT valid_patch_color CHECK ("patchColor" IN ('grey', 'blue', 'gold', 'none')); 