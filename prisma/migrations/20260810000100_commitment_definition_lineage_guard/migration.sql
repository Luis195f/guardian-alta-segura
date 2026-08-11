-- Forward-only hardening for the synthetic 5B definition lineage.
-- No data is created or backfilled.

CREATE UNIQUE INDEX "commitment_definition_versions_base_unique"
  ON "commitment_definition_versions"("based_on_version_id");

CREATE FUNCTION enforce_commitment_definition_version_insert() RETURNS trigger AS $$
DECLARE prior_version_number INTEGER;
BEGIN
  IF NEW."version_number" = 1 THEN
    IF NEW."based_on_version_id" IS NOT NULL OR EXISTS (
      SELECT 1
      FROM "commitment_definition_versions" AS existing
      WHERE existing."definition_id" = NEW."definition_id"
    ) THEN
      RAISE EXCEPTION 'invalid initial commitment definition version';
    END IF;
    RETURN NEW;
  END IF;

  SELECT prior."version_number" INTO prior_version_number
  FROM "commitment_definition_versions" AS prior
  WHERE prior."id" = NEW."based_on_version_id"
    AND prior."definition_id" = NEW."definition_id";

  IF prior_version_number IS NULL OR NEW."version_number" <> prior_version_number + 1 THEN
    RAISE EXCEPTION 'commitment definition versions require strict N+1 lineage';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commitment_definition_versions_validate_insert
  BEFORE INSERT ON "commitment_definition_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_commitment_definition_version_insert();
