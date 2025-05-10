-- Drop the existing enum type (with CASCADE to handle columns using it)
DROP TYPE IF EXISTS "enum_TeamMembers_status" CASCADE;

-- Create the new enum type with all values
CREATE TYPE "enum_TeamMembers_status" AS ENUM ('active', 'inactive', 'pending', 'blocked', 'removed', 'invited');

-- Alter the column to use the new enum type
ALTER TABLE "TeamMembers" 
  ALTER COLUMN status TYPE "enum_TeamMembers_status" 
  USING status::text::"enum_TeamMembers_status"; 