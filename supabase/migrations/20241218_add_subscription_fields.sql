-- Add subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_chat_count_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_chat_last_reset DATE DEFAULT CURRENT_DATE;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_plan, subscription_end_date);

-- Comment on columns
COMMENT ON COLUMN profiles.subscription_plan IS 'Current subscription plan: basic, standard, ultra';
COMMENT ON COLUMN profiles.subscription_end_date IS 'When the current subscription expires';
COMMENT ON COLUMN profiles.ai_chat_count_today IS 'Number of AI chat messages sent today';
COMMENT ON COLUMN profiles.ai_chat_last_reset IS 'Last date when AI chat count was reset';
