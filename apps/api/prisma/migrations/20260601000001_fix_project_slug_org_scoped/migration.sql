-- DropIndex
DROP INDEX "projects_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_organization_id_key" ON "projects"("slug", "organization_id");
