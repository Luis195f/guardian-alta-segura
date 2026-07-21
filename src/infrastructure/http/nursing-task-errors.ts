import {
  NursingTaskConflictError,
  NursingTaskDeniedError,
  NursingTaskNotFoundError,
  NursingTaskValidationError,
} from "@/application/workqueue/manage-nursing-tasks";
import { errors } from "@/infrastructure/http/app-error";

export function mapNursingTaskError(error: unknown): never {
  if (error instanceof NursingTaskDeniedError) throw errors.forbidden();
  if (error instanceof NursingTaskNotFoundError) throw errors.notFound();
  if (error instanceof NursingTaskConflictError) throw errors.conflict();
  if (error instanceof NursingTaskValidationError) throw errors.badRequest();
  throw error;
}
