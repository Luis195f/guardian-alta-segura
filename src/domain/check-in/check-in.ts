export const CHECK_IN_QUESTION_TYPES = [
  "SCALE",
  "YES_NO",
  "SINGLE_CHOICE",
  "RESTRICTED_SHORT_TEXT",
] as const;

export type CheckInQuestionType = (typeof CHECK_IN_QUESTION_TYPES)[number];
export type CheckInProtocolState = "DRAFT" | "SYNTHETIC_DEMO" | "RETIRED";
export type CheckInAssignmentStatus = "PENDING" | "RESPONDED" | "EXPIRED" | "OMITTED";

interface QuestionBase {
  readonly id?: string;
  readonly questionKey: string;
  readonly position: number;
  readonly prompt: string;
  readonly required: boolean;
}

export interface ScaleQuestion extends QuestionBase {
  readonly type: "SCALE";
  readonly scaleMinimum: number;
  readonly scaleMaximum: number;
  readonly scaleMinimumLabel?: string | null;
  readonly scaleMaximumLabel?: string | null;
}

export interface YesNoQuestion extends QuestionBase {
  readonly type: "YES_NO";
}

export interface SingleChoiceQuestion extends QuestionBase {
  readonly type: "SINGLE_CHOICE";
  readonly options: readonly string[];
}

export interface RestrictedShortTextQuestion extends QuestionBase {
  readonly type: "RESTRICTED_SHORT_TEXT";
  readonly maximumTextLength: number;
}

export type QuestionDefinitionInput =
  ScaleQuestion | YesNoQuestion | SingleChoiceQuestion | RestrictedShortTextQuestion;

export interface ScheduleConfigurationInput {
  readonly intervalDays: number;
  readonly firstDayOffset: number;
  readonly localTime: string;
  readonly timeZone: string;
  readonly responseWindowMinutes: number;
}

export type CheckInAnswerInput =
  | { readonly questionDefinitionId: string; readonly scaleValue: number }
  | { readonly questionDefinitionId: string; readonly yesNoValue: boolean }
  | { readonly questionDefinitionId: string; readonly selectedOption: string }
  | { readonly questionDefinitionId: string; readonly shortTextValue: string };

export class CheckInValidationError extends Error {}

function assertIntegerInRange(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new CheckInValidationError(`${label} is outside the allowed range`);
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function validateSchedule(schedule: ScheduleConfigurationInput): ScheduleConfigurationInput {
  if (
    !schedule ||
    typeof schedule !== "object" ||
    typeof schedule.localTime !== "string" ||
    typeof schedule.timeZone !== "string"
  ) {
    throw new CheckInValidationError("Invalid schedule configuration");
  }
  assertIntegerInRange(schedule.intervalDays, 1, 90, "Interval");
  assertIntegerInRange(schedule.firstDayOffset, 0, 90, "First day offset");
  assertIntegerInRange(schedule.responseWindowMinutes, 15, 10_080, "Response window");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.localTime)) {
    throw new CheckInValidationError("Local time must use HH:mm");
  }
  if (!isValidTimeZone(schedule.timeZone)) {
    throw new CheckInValidationError("Unknown IANA time zone");
  }
  return schedule;
}

function validateQuestion(question: QuestionDefinitionInput): void {
  if (
    !question ||
    typeof question !== "object" ||
    typeof question.questionKey !== "string" ||
    typeof question.position !== "number" ||
    typeof question.prompt !== "string" ||
    typeof question.required !== "boolean" ||
    !CHECK_IN_QUESTION_TYPES.includes(question.type)
  ) {
    throw new CheckInValidationError("Invalid question definition");
  }
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(question.questionKey)) {
    throw new CheckInValidationError("Invalid question key");
  }
  assertIntegerInRange(question.position, 1, 50, "Question position");
  const prompt = question.prompt.trim();
  if (!prompt || prompt.length > 240) throw new CheckInValidationError("Invalid prompt");

  if (question.type === "SCALE") {
    assertIntegerInRange(question.scaleMinimum, -100, 100, "Scale minimum");
    assertIntegerInRange(question.scaleMaximum, -100, 100, "Scale maximum");
    if (question.scaleMaximum <= question.scaleMinimum) {
      throw new CheckInValidationError("Scale maximum must exceed minimum");
    }
    if (question.scaleMaximum - question.scaleMinimum > 20) {
      throw new CheckInValidationError("Scale range is too wide for a brief check-in");
    }
  }
  if (question.type === "SINGLE_CHOICE") {
    if (
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > 8
    ) {
      throw new CheckInValidationError("Single choice requires 2 to 8 options");
    }
    const normalized = question.options.map((option) => option.trim());
    if (
      normalized.some((option) => !option || option.length > 120) ||
      new Set(normalized).size !== normalized.length
    ) {
      throw new CheckInValidationError("Single choice options must be unique and non-empty");
    }
  }
  if (question.type === "RESTRICTED_SHORT_TEXT") {
    assertIntegerInRange(question.maximumTextLength, 1, 280, "Maximum text length");
  }
}

export function validateProtocolDefinition(input: {
  readonly protocolKey: string;
  readonly title: string;
  readonly questions: readonly QuestionDefinitionInput[];
  readonly schedule: ScheduleConfigurationInput;
}): void {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.protocolKey !== "string" ||
    typeof input.title !== "string" ||
    !Array.isArray(input.questions)
  ) {
    throw new CheckInValidationError("Invalid protocol definition");
  }
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(input.protocolKey)) {
    throw new CheckInValidationError("Invalid protocol key");
  }
  if (!input.title.trim() || input.title.trim().length > 160) {
    throw new CheckInValidationError("Invalid protocol title");
  }
  if (input.questions.length < 1 || input.questions.length > 12) {
    throw new CheckInValidationError("A brief check-in requires 1 to 12 questions");
  }
  input.questions.forEach(validateQuestion);
  if (
    new Set(input.questions.map(({ questionKey }) => questionKey)).size !== input.questions.length
  ) {
    throw new CheckInValidationError("Question keys must be unique");
  }
  if (new Set(input.questions.map(({ position }) => position)).size !== input.questions.length) {
    throw new CheckInValidationError("Question positions must be unique");
  }
  validateSchedule(input.schedule);
}

function datePartsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function zonedDateTimeToUtc(localDate: string, localTime: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new CheckInValidationError("Invalid local date");
  }
  validateSchedule({
    intervalDays: 1,
    firstDayOffset: 0,
    localTime,
    timeZone,
    responseWindowMinutes: 15,
  });
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new CheckInValidationError("Invalid local date or time");
  }
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(desiredUtc);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = datePartsInZone(candidate, timeZone);
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate = new Date(candidate.getTime() + desiredUtc - representedAsUtc);
  }

  const result = datePartsInZone(candidate, timeZone);
  if (
    Number(result.year) !== year ||
    Number(result.month) !== month ||
    Number(result.day) !== day ||
    Number(result.hour) !== hour ||
    Number(result.minute) !== minute
  ) {
    throw new CheckInValidationError("Local time does not exist in the configured time zone");
  }
  return candidate;
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export interface ScheduledCheckInSlot {
  readonly sequence: number;
  readonly scheduledFor: Date;
  readonly windowStartsAt: Date;
  readonly windowEndsAt: Date;
}

export function buildScheduleSlots(input: {
  readonly episodeStartDate: string;
  readonly episodeLengthDays: number;
  readonly schedule: ScheduleConfigurationInput;
}): readonly ScheduledCheckInSlot[] {
  validateSchedule(input.schedule);
  assertIntegerInRange(input.episodeLengthDays, 1, 365, "Episode length");
  const start = new Date(`${input.episodeStartDate}T00:00:00.000Z`);
  if (
    Number.isNaN(start.valueOf()) ||
    start.toISOString().slice(0, 10) !== input.episodeStartDate
  ) {
    throw new CheckInValidationError("Invalid episode start date");
  }

  const slots: ScheduledCheckInSlot[] = [];
  for (
    let offset = input.schedule.firstDayOffset, sequence = 1;
    offset < input.episodeLengthDays;
    offset += input.schedule.intervalDays, sequence += 1
  ) {
    const localDate = addUtcDays(start, offset).toISOString().slice(0, 10);
    const scheduledFor = zonedDateTimeToUtc(
      localDate,
      input.schedule.localTime,
      input.schedule.timeZone,
    );
    slots.push({
      sequence,
      scheduledFor,
      windowStartsAt: scheduledFor,
      windowEndsAt: new Date(
        scheduledFor.getTime() + input.schedule.responseWindowMinutes * 60_000,
      ),
    });
  }
  return slots;
}

export function getAssignmentStatus(input: {
  readonly now: Date;
  readonly windowEndsAt: Date;
  readonly hasResponse: boolean;
  readonly nonResponseReason: "WINDOW_EXPIRED" | "PATIENT_OMITTED" | null;
}): CheckInAssignmentStatus {
  if (input.hasResponse) return "RESPONDED";
  if (input.nonResponseReason === "PATIENT_OMITTED") return "OMITTED";
  if (input.nonResponseReason === "WINDOW_EXPIRED" || input.now >= input.windowEndsAt) {
    return "EXPIRED";
  }
  return "PENDING";
}

function answerValueCount(answer: CheckInAnswerInput): number {
  return ["scaleValue", "yesNoValue", "selectedOption", "shortTextValue"].filter(
    (key) => key in answer,
  ).length;
}

export function validateAnswers(
  questions: readonly (QuestionDefinitionInput & { readonly id: string })[],
  answers: readonly CheckInAnswerInput[],
): readonly CheckInAnswerInput[] {
  if (
    !Array.isArray(answers) ||
    answers.some(
      (answer) =>
        !answer || typeof answer !== "object" || typeof answer.questionDefinitionId !== "string",
    )
  ) {
    throw new CheckInValidationError("Invalid answer definition");
  }
  if (
    new Set(answers.map(({ questionDefinitionId }) => questionDefinitionId)).size !== answers.length
  ) {
    throw new CheckInValidationError("A question cannot be answered twice");
  }
  const byId = new Map(answers.map((answer) => [answer.questionDefinitionId, answer]));
  for (const answer of answers) {
    if (answerValueCount(answer) !== 1) throw new CheckInValidationError("Invalid answer shape");
    const question = questions.find(({ id }) => id === answer.questionDefinitionId);
    if (!question) throw new CheckInValidationError("Answer references another protocol version");
    if (question.type === "SCALE") {
      if (
        !("scaleValue" in answer) ||
        !Number.isInteger(answer.scaleValue) ||
        answer.scaleValue < question.scaleMinimum ||
        answer.scaleValue > question.scaleMaximum
      ) {
        throw new CheckInValidationError("Scale answer is outside its configured bounds");
      }
    } else if (question.type === "YES_NO") {
      if (!("yesNoValue" in answer) || typeof answer.yesNoValue !== "boolean") {
        throw new CheckInValidationError("Yes/no answer has the wrong type");
      }
    } else if (question.type === "SINGLE_CHOICE") {
      if (!("selectedOption" in answer) || !question.options.includes(answer.selectedOption)) {
        throw new CheckInValidationError("Option is not part of the question version");
      }
    } else if (
      !("shortTextValue" in answer) ||
      !answer.shortTextValue.trim() ||
      answer.shortTextValue.length > question.maximumTextLength
    ) {
      throw new CheckInValidationError("Short text answer is invalid");
    }
  }
  if (questions.some((question) => question.required && !byId.has(question.id))) {
    throw new CheckInValidationError("A required question is missing");
  }
  return answers;
}
