-- Create enum type for team member status
CREATE TYPE "enum_TeamMembers_status" AS ENUM ('active', 'inactive', 'pending', 'blocked', 'removed', 'invited');

-- Create enum type for team member role
CREATE TYPE "enum_TeamMembers_role" AS ENUM ('admin', 'manager', 'editor', 'viewer');

-- Create TeamMembers table
CREATE TABLE "TeamMembers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" "enum_TeamMembers_role" DEFAULT 'viewer',
  "status" "enum_TeamMembers_status" DEFAULT 'pending',
  "invitationToken" VARCHAR(255),
  "invitationExpires" TIMESTAMP,
  "resetPasswordToken" VARCHAR(255),
  "resetPasswordExpires" TIMESTAMP,
  "lastLogin" TIMESTAMP,
  "canManageTeam" BOOLEAN DEFAULT false,
  "canManageSubscription" BOOLEAN DEFAULT false,
  "canManageProducts" BOOLEAN DEFAULT false,
  "canViewAnalytics" BOOLEAN DEFAULT false,
  "currentSessionId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("businessId") REFERENCES "Businesses"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "idx_team_members_email" ON "TeamMembers"("email");
CREATE INDEX "idx_team_members_business" ON "TeamMembers"("businessId");
CREATE INDEX "idx_team_members_invitation" ON "TeamMembers"("invitationToken");

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON "TeamMembers"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 