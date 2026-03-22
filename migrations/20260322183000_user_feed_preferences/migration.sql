CREATE TYPE "FeedPreferenceScope" AS ENUM ('HOME', 'FOLLOWING', 'POPULAR', 'ALL');

CREATE TYPE "FeedPreferenceSort" AS ENUM ('HOT', 'NEW', 'TOP', 'RISING');

ALTER TABLE "User"
ADD COLUMN "defaultFeedScope" "FeedPreferenceScope" NOT NULL DEFAULT 'HOME',
ADD COLUMN "defaultFeedSort" "FeedPreferenceSort" NOT NULL DEFAULT 'HOT';
