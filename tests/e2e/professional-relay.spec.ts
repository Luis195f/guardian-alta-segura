import { expect, test } from "@playwright/test";

import { prisma } from "../../src/infrastructure/persistence/prisma";

const EPISODE_ID = "synthetic-demo-episode-buildweek";
const TASK_ID = "synthetic-demo-professional-review-task";
const SYNTHETIC_PHONE = ["+", "34", "600", "000", "002"].join("");

test("Professional Relay aplica solo el fixture predeterminado y conserva Task y RoleAssignment", async ({
  page,
}) => {
  const taskBefore = await prisma.task.findUniqueOrThrow({
    where: { id: TASK_ID },
    include: { events: { orderBy: { resultingRevision: "asc" } } },
  });
  const [rolesBefore, attemptsBefore, patientAttemptsBefore, outboundBefore, taskAuditsBefore] =
    await Promise.all([
      prisma.roleAssignment.findMany({ orderBy: { id: "asc" } }),
      prisma.relayAttempt.count({
        where: {
          episodeRef: EPISODE_ID,
          recipientKind: "PROFESSIONAL",
          purpose: "PROFESSIONAL_REVIEW_REQUEST",
        },
      }),
      prisma.relayAttempt.count({
        where: {
          episodeRef: EPISODE_ID,
          recipientKind: "PATIENT",
          purpose: "PATIENT_CALLBACK_OFFER",
        },
      }),
      prisma.outboundCallIntent.count(),
      prisma.auditEvent.count({
        where: {
          resourceType: "Task",
          resourceId: TASK_ID,
          action: { in: ["TASK_ASSIGNED", "TASK_REASSIGNED", "TASK_RESOLVED"] },
        },
      }),
    ]);
  const targetUserId = taskBefore.assignedToId;
  expect(targetUserId).not.toBeNull();

  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-nurse");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/episodes/${EPISODE_ID}`);

  const relayTab = page.getByRole("tab", { name: "Professional Relay" });
  await relayTab.focus();
  await relayTab.press("Enter");
  await expect(relayTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Professional Relay", level: 2 })).toBeVisible();
  await expect(
    page.getByText(
      "Todos los valores mostrados proceden de un fixture sintético predeterminado de la aplicación.",
      { exact: true },
    ),
  ).toBeVisible();

  const endpoint = `/api/demo/discharge-episodes/${EPISODE_ID}/professional-relay`;
  const rejectedOverride = await page.request.post(`${endpoint}/preview`, {
    headers: { Origin: new URL(page.url()).origin },
    data: {
      userId: "client-user",
      professionalId: "client-professional",
      targetRef: "client-target",
      taskRef: "client-task",
      phone: SYNTHETIC_PHONE,
    },
  });
  expect(rejectedOverride.status()).toBe(400);
  await expect(
    prisma.relayAttempt.count({
      where: { episodeRef: EPISODE_ID, recipientKind: "PROFESSIONAL" },
    }),
  ).resolves.toBe(attemptsBefore);

  const previewButton = page.getByRole("button", {
    name: "Crear preview de Professional Relay",
  });
  await previewButton.focus();
  await previewButton.press("Enter");
  await expect(page.getByText(/Preview profesional creado sin red/)).toBeFocused();
  await expect(page.getByText("+34*******02", { exact: true })).toBeVisible();
  await expect(page.getByText(TASK_ID, { exact: true })).toBeVisible();
  await expect(page.getByText(/synthetic-professional-relay-v1/)).toBeVisible();
  await expect(page.getByText(/agente de IA/)).toBeVisible();
  await expect(page.getByText(/una única pregunta administrativa/)).toBeVisible();
  await expect(
    page.getByText("intended_professional | wrong_recipient | unknown", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("acknowledged", { exact: true })).toBeVisible();
  await expect(page.getByText("availability_to_review", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(SYNTHETIC_PHONE);
  await expect(page.locator("body")).not.toContainText(targetUserId!);

  const previewRead = await page.request.get(endpoint);
  const previewBody = JSON.stringify(await previewRead.json());
  expect(previewBody).not.toContain("confirmationToken");
  expect(previewBody).not.toContain("targetRef");
  expect(previewBody).not.toContain(targetUserId!);
  expect(previewBody).not.toContain(SYNTHETIC_PHONE);

  const concurrentButton = page.getByRole("button", {
    name: "Ensayar doble confirmación profesional",
  });
  await concurrentButton.focus();
  await concurrentButton.press("Enter");
  await expect(page.getByText(/Doble confirmación contenida/)).toBeFocused();
  await expect(page.getByText("intended_professional", { exact: true })).toBeVisible();
  await expect(page.getByText("yes", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/No demuestran conversación, verificación verbal/)).toBeVisible();
  await expect(page.getByText(/acknowledged=yes no significa Task accepted/).last()).toBeVisible();
  await expect(page.getByRole("heading", { name: "4. Revisión humana pendiente" })).toBeVisible();

  const attempt = await prisma.relayAttempt.findFirstOrThrow({
    where: {
      episodeRef: EPISODE_ID,
      recipientKind: "PROFESSIONAL",
      purpose: "PROFESSIONAL_REVIEW_REQUEST",
    },
    orderBy: { createdAt: "desc" },
    include: { events: true },
  });
  expect(attempt).toMatchObject({
    lifecycleState: "RESULT_COMPLETED",
    resultValidity: "VALID",
    identityStatus: "INTENDED_PROFESSIONAL",
    contactStatus: "REACHED",
    callbackPreference: null,
    acknowledged: "YES",
    availabilityToReview: "YES",
    boundaryEvent: "NONE",
    taskRef: TASK_ID,
    targetRef: targetUserId,
    reviewedAt: null,
  });
  expect(attempt.events.map(({ toState }) => toState)).toEqual([
    "PREVIEWED",
    "CONFIRMED",
    "PROVIDER_CREATED",
    "RESULT_COMPLETED",
  ]);
  await expect(prisma.outboundCallIntent.count()).resolves.toBe(outboundBefore + 1);
  await expect(
    prisma.relayAttempt.count({
      where: { episodeRef: EPISODE_ID, recipientKind: "PATIENT" },
    }),
  ).resolves.toBe(patientAttemptsBefore);

  const taskAfterResult = await prisma.task.findUniqueOrThrow({
    where: { id: TASK_ID },
    include: { events: { orderBy: { resultingRevision: "asc" } } },
  });
  expect(taskAfterResult).toEqual(taskBefore);
  expect(taskAfterResult.currentState).toBe("OPEN");
  expect(taskAfterResult.assignedToId).toBe(targetUserId);
  await expect(prisma.roleAssignment.findMany({ orderBy: { id: "asc" } })).resolves.toEqual(
    rolesBefore,
  );
  await expect(
    prisma.auditEvent.count({
      where: {
        resourceType: "Task",
        resourceId: TASK_ID,
        action: { in: ["TASK_ASSIGNED", "TASK_REASSIGNED", "TASK_RESOLVED"] },
      },
    }),
  ).resolves.toBe(taskAuditsBefore);

  const reviewButton = page.getByRole("button", {
    name: "Registrar revisión humana profesional",
  });
  await reviewButton.focus();
  await reviewButton.press("Enter");
  await expect(page.getByText(/Revisión humana registrada; no es aprobación/)).toBeFocused();
  await expect(page.getByText(/HUMAN_REVIEWED no es aprobación clínica/)).toBeVisible();

  const [reviewed, taskAfterReview, rolesAfter] = await Promise.all([
    prisma.relayAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
    prisma.task.findUniqueOrThrow({
      where: { id: TASK_ID },
      include: { events: { orderBy: { resultingRevision: "asc" } } },
    }),
    prisma.roleAssignment.findMany({ orderBy: { id: "asc" } }),
  ]);
  expect(reviewed.lifecycleState).toBe("HUMAN_REVIEWED");
  expect(taskAfterReview).toEqual(taskBefore);
  expect(rolesAfter).toEqual(rolesBefore);
});

test("un rol patient no puede iniciar Professional Relay", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-patient");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/my-follow-up$/);
  const origin = new URL(page.url()).origin;
  const patientResponse = await page.request.post(
    `/api/demo/discharge-episodes/${EPISODE_ID}/professional-relay/preview`,
    { headers: { Origin: origin }, data: {} },
  );
  expect(patientResponse.status()).toBe(403);
});

test("el profesional destinatario no puede autoautorizar el Relay", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuario demo").selectOption("demo-clinician");
  await page.getByRole("button", { name: "INICIAR DEMO" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const origin = new URL(page.url()).origin;
  const targetResponse = await page.request.post(
    `/api/demo/discharge-episodes/${EPISODE_ID}/professional-relay/preview`,
    { headers: { Origin: origin }, data: {} },
  );
  expect(targetResponse.status()).toBe(503);
});
