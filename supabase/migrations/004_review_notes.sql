-- Add review_notes column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_notes TEXT;
