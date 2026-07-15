CREATE INDEX IF NOT EXISTS "users_is_admin_idx" ON "users"("is_admin");
CREATE INDEX IF NOT EXISTS "connections_to_id_idx" ON "connections"("to_id");
CREATE INDEX IF NOT EXISTS "connection_requests_to_id_idx" ON "connection_requests"("to_id");
