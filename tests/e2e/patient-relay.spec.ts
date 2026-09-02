import { expect, test } from "@playwright/test";

import { prisma } from "../../src/infrastructure/persistence/prisma";

const EPISODE_ID = "synthetic-demo-episode-buildweek";
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "001"].join("");

test("Patient Relay sintético presenta contrato, fixture, carrera y revisión sin mutar Task o roles", async ({
  page,
}) => {
  const [tasksBefore, rolesBefore, attemptsBefore, outboundBefore] = await Promise.all([
    prisma.task.count({ where: { episodeId: EPISODE_ID } }),
    prisma.roleAssignment.count(),
    prisma.relayAttempt.count({ where: { episodeRef: EPISODE_ID } }),
    prisma.outboundCallIntent.count(),
  ]);

  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/episodes/${EPISODE_ID}`);

  const relayTab = page.getByRole("tab", { name: "Patient Relay" });
  await relayTab.focus();
  await relayTab.press("Enter");
  await expect(relayTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Patient Relay", level: 2 })).toBeVisible();

  const rejectedOverride = await page.request.post(
    `/api/demo/discharge-episodes/${EPISODE_ID}/patient-relay/preview`,
    {
      headers: { Origin: new URL(page.url()).origin },
      data: { targetRef: "client-target", taskRef: "client-task", phone: SYNTHETIC_PHONE },
    },
  );
  expect(rejectedOverride.status()).toBe(400);
  await expect(prisma.relayAttempt.count({ where: { episodeRef: EPISODE_ID } })).resolves.toBe(
    attemptsBefore,
  );

  const previewButton = page.getByRole("button", { name: "Crear preview de Patient Relay" });
  await previewButton.focus();
  await previewButton.press("Enter");
  await expect(page.getByText("Preview creado sin red", { exact: false })).toBeFocused();
  await expect(
    page.getByText("Ofrecer contacto o callback humano", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("+34*******01", { exact: true })).toBeVisible();
  await expect(page.getByText("SYNTHETIC_LOCAL_NO_PROVIDER", { exact: true })).toBeVisible();
  await expect(page.getByText("synthetic-patient-relay-v1", { exact: false })).toBeVisible();
  await expect(page.getByText(/No realiza evaluación clínica/)).toBeVisible();
  await expect(page.getByText(/Sin cancelación API/)).toBeVisible();
  await expect(page.getByText(/propiedades adicionales rechazadas/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(SYNTHETIC_PHONE);

  const previewRead = await page.request.get(
    `/api/demo/discharge-episodes/${EPISODE_ID}/patient-relay`,
  );
  const previewBody = JSON.stringify(await previewRead.json());
  expect(previewBody).not.toContain("confirmationToken");
  expect(previewBody).not.toContain("targetRef");
  expect(previewBody).not.toContain(SYNTHETIC_PHONE);

  const concurrentButton = page.getByRole("button", { name: "Ensayar doble confirmación" });
  await concurrentButton.focus();
  await concurrentButton.press("Enter");
  await expect(page.getByText(/Doble confirmación contenida/)).toBeFocused();
  await expect(
    page.getByText(
      "Fixture sintético: identity_status=wrong_recipient. No hubo conversación ni se verificó divulgación real.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Fixture sintético: boundary_event=out_of_scope_request. No hubo conversación ni se verificó la respuesta de un agente.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "4. Revisión humana pendiente" })).toBeVisible();

  const attempts = await prisma.relayAttempt.findMany({
    where: { episodeRef: EPISODE_ID },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: { events: true },
  });
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({
    lifecycleState: "RESULT_COMPLETED",
    resultValidity: "VALID",
    identityStatus: "WRONG_RECIPIENT",
    contactStatus: "REACHED",
    callbackPreference: "REQUESTED",
    boundaryEvent: "OUT_OF_SCOPE_REQUEST",
    taskRef: null,
  });
  expect(attempts[0]!.events.map(({ toState }) => toState)).toEqual([
    "PREVIEWED",
    "CONFIRMED",
    "PROVIDER_CREATED",
    "RESULT_COMPLETED",
  ]);
  await expect(prisma.outboundCallIntent.count()).resolves.toBe(outboundBefore + 1);
  await expect(
    prisma.auditEvent.count({
      where: {
        resourceId: attempts[0]!.id,
        action: "RELAY_SYNTHETIC_EXECUTION_RECORDED",
      },
    }),
  ).resolves.toBe(1);

  const reviewButton = page.getByRole("button", { name: "Registrar revisión humana" });
  await reviewButton.focus();
  await reviewButton.press("Enter");
  await expect(page.getByText(/Revisión humana registrada\. No equivale/)).toBeFocused();
  await expect(page.getByText(/No es aprobación clínica/)).toBeVisible();

  const [reviewed, tasksAfter, rolesAfter] = await Promise.all([
    prisma.relayAttempt.findUniqueOrThrow({ where: { id: attempts[0]!.id } }),
    prisma.task.count({ where: { episodeId: EPISODE_ID } }),
    prisma.roleAssignment.count(),
  ]);
  expect(reviewed.lifecycleState).toBe("HUMAN_REVIEWED");
  expect(tasksAfter).toBe(tasksBefore);
  expect(rolesAfter).toBe(rolesBefore);
  await expect(
    prisma.auditEvent.count({
      where: { resourceId: reviewed.id, action: "RELAY_HUMAN_REVIEW_RECORDED" },
    }),
  ).resolves.toBe(1);
});

test("patient no puede iniciar Patient Relay profesional", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);
  const response = await page.request.post(
    `/api/demo/discharge-episodes/${EPISODE_ID}/patient-relay/preview`,
    { headers: { Origin: new URL(page.url()).origin }, data: {} },
  );
  expect(response.status()).toBe(403);
});
