CREATE TABLE "Businesses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerName" VARCHAR(255) NOT NULL,
  "businessName" VARCHAR(255) NOT NULL,
  "identityNumber" VARCHAR(11) NOT NULL UNIQUE,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "subscriptionTier" VARCHAR(50) DEFAULT 'free',
  "status" VARCHAR(50) DEFAULT 'pending_verification',
  "isVerified" BOOLEAN DEFAULT false,
  "verificationToken" VARCHAR(255),
  "verificationTokenExpires" TIMESTAMP,
  "passwordResetToken" VARCHAR(255),
  "passwordResetExpires" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "lastLogin" TIMESTAMP,
  CONSTRAINT valid_subscription_tier CHECK ("subscriptionTier" IN ('free', 'smart', 'pro')),
  CONSTRAINT valid_status CHECK ("status" IN ('pending_verification', 'active', 'suspended', 'cancelled'))
);

-- Create index for faster email lookups
CREATE INDEX "idx_businesses_email" ON "Businesses"("email");

-- Create index for faster identity number lookups
CREATE INDEX "idx_businesses_identity" ON "Businesses"("identityNumber");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON "Businesses"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 