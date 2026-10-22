# Migrations

No application tables are defined in FH-CX-001. Later migrations must keep
family data tenant-scoped and must use PostgreSQL Row Level Security (RLS).
Private content must be enforced by database policies, not only by frontend
checks. Do not store real personal data in foundation tests.
