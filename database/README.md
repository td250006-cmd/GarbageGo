# Database setup

1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. Run `seed.sql` to load the latest observation for each `bin_id` from `ml/dataset.csv`.
4. In Authentication, create:
   - Admin user with `user_metadata.role = admin`
   - Driver user with `user_metadata.role = driver` and `user_metadata.truck_id = TRK-01`
5. Copy the project URL and anon key into `frontend/.env`.
6. Copy the project URL and service role key into `backend/.env`.

Seed data uses the same field names as the dataset. Do not rename `bin_fill_level` or other ML columns.

Service-role inserts from FastAPI bypass RLS. Browser inserts use the authenticated policies above.
