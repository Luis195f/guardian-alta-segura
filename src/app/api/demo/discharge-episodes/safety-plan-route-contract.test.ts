import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, it } from "vitest";

it("no expone endpoint de hard-delete para el plan de seguridad", async () => {
  const route = await readFile(
    join(process.cwd(), "src/app/api/demo/discharge-episodes/[episodeId]/safety-plan/route.ts"),
    "utf8",
  );
  expect(route).not.toMatch(/export\s+async\s+function\s+DELETE/u);
});
