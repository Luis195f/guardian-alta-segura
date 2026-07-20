import {
  ExplainableAlertConflictError,
  ExplainableAlertDeniedError,
  ExplainableAlertInvalidError,
  ExplainableAlertNotFoundError,
} from "@/application/alerts/manage-explainable-alerts";
import { errors } from "@/infrastructure/http/app-error";

export function mapExplainableAlertError(error: unknown): never {
  if (error instanceof ExplainableAlertDeniedError) throw errors.forbidden();
  if (error instanceof ExplainableAlertNotFoundError) throw errors.notFound();
  if (error instanceof ExplainableAlertConflictError) throw errors.conflict();
  if (error instanceof ExplainableAlertInvalidError) throw errors.badRequest();
  throw error;
}
