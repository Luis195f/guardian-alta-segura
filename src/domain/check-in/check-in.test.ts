import { describe, expect, it } from "vitest";

import {
  buildScheduleSlots,
  CheckInValidationError,
  getAssignmentStatus,
  validateAnswers,
  validateProtocolDefinition,
} from "@/domain/check-in/check-in";
import {
  SYNTHETIC_CHECK_IN_NOTICE,
  SYNTHETIC_CHECK_IN_QUESTIONS,
} from "@/domain/check-in/synthetic-fixtures";

const schedule = {
  intervalDays: 3,
  firstDayOffset: 1,
  localTime: "09:30",
  timeZone: "Europe/Madrid",
  responseWindowMinutes: 180,
} as const;

describe("check-in protocol", () => {
  it("aplica la cadencia y zona horaria configuradas sin una frecuencia clínica constante", () => {
    const slots = buildScheduleSlots({
      episodeStartDate: "2026-07-01",
      episodeLengthDays: 10,
      schedule,
    });

    expect(slots).toHaveLength(3);
    expect(slots.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
    expect(slots.map(({ scheduledFor }) => scheduledFor.toISOString())).toEqual([
      "2026-07-02T07:30:00.000Z",
      "2026-07-05T07:30:00.000Z",
      "2026-07-08T07:30:00.000Z",
    ]);
    expect(slots[0]!.windowEndsAt.getTime() - slots[0]!.windowStartsAt.getTime()).toBe(
      180 * 60_000,
    );
  });

  it("rechaza ventanas, horas y zonas no válidas sin atribuir urgencia", () => {
    expect(() =>
      validateProtocolDefinition({
        protocolKey: "synthetic-demo",
        title: "Plantilla sintética",
        questions: SYNTHETIC_CHECK_IN_QUESTIONS,
        schedule: { ...schedule, timeZone: "Zona/Inventada" },
      }),
    ).toThrow(CheckInValidationError);
  });

  it("conserva el tipo y límites de la versión exacta al validar respuestas", () => {
    const questions = [
      {
        id: "q-scale-v1",
        questionKey: "mood",
        position: 1,
        type: "SCALE" as const,
        prompt: "Ánimo sintético",
        required: true,
        scaleMinimum: 0,
        scaleMaximum: 4,
      },
    ];
    expect(
      validateAnswers(questions, [{ questionDefinitionId: "q-scale-v1", scaleValue: 3 }]),
    ).toHaveLength(1);
    expect(() =>
      validateAnswers(questions, [{ questionDefinitionId: "q-scale-v2", scaleValue: 3 }]),
    ).toThrow("another protocol version");
  });

  it("distingue no respuesta y omisión de una respuesta clínica", () => {
    const windowEndsAt = new Date("2026-07-02T10:00:00.000Z");
    expect(
      getAssignmentStatus({
        now: new Date("2026-07-02T11:00:00.000Z"),
        windowEndsAt,
        hasResponse: false,
        nonResponseReason: null,
      }),
    ).toBe("EXPIRED");
    expect(
      getAssignmentStatus({
        now: new Date("2026-07-02T09:00:00.000Z"),
        windowEndsAt,
        hasResponse: false,
        nonResponseReason: "PATIENT_OMITTED",
      }),
    ).toBe("OMITTED");
  });

  it("marca los ocho temas como fixture sintético no aprobado", () => {
    expect(SYNTHETIC_CHECK_IN_QUESTIONS).toHaveLength(8);
    expect(SYNTHETIC_CHECK_IN_NOTICE).toContain("NO APROBADA");
  });
});
