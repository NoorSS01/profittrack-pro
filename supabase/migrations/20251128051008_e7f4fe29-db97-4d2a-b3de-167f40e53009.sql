-- Remove unique constraint to allow multiple entries per day for the same vehicle
ALTER TABLE daily_entries 
DROP CONSTRAINT IF EXISTS daily_entries_user_id_vehicle_id_entry_date_key;