INSERT INTO categories (id, name, icon, created_at) VALUES
    ('a1b2c3d4-0001-4000-8000-000000000001', 'Food', '🍔', NOW()),
    ('a1b2c3d4-0002-4000-8000-000000000002', 'Transport', '🚗', NOW()),
    ('a1b2c3d4-0003-4000-8000-000000000003', 'Shopping', '🛍️', NOW()),
    ('a1b2c3d4-0004-4000-8000-000000000004', 'Bills', '📄', NOW()),
    ('a1b2c3d4-0005-4000-8000-000000000005', 'Entertainment', '🎬', NOW()),
    ('a1b2c3d4-0006-4000-8000-000000000006', 'Health', '💊', NOW()),
    ('a1b2c3d4-0007-4000-8000-000000000007', 'Education', '📚', NOW()),
    ('a1b2c3d4-0008-4000-8000-000000000008', 'Other', '📦', NOW()),
    ('a1b2c3d4-0009-4000-8000-000000000009', 'Groceries', '🛒', NOW()),
    ('a1b2c3d4-0010-4000-8000-000000000010', 'Subscriptions', '🔄', NOW())
ON CONFLICT (name) DO NOTHING;
