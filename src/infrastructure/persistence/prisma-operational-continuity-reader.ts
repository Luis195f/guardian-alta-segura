import { Prisma } from "@prisma/client";

import type { AuthenticatedPrincipal } from "@/domain/auth/principal";
import {
  canonicalOperationalHref,
  type OperationalAdministrativeState,
  type OperationalContinuityItem,
  type OperationalContinuityPage,
  type OperationalCursorPosition,
  type OperationalSourceType,
} from "@/domain/continuity/operational-continuity";
import { prisma } from "@/infrastructure/persistence/prisma";

export const OPERATIONAL_CONTINUITY_DEFAULT_PAGE_SIZE = 12;
export const OPERATIONAL_CONTINUITY_MAX_PAGE_SIZE = 25;

interface OperationalRow {
  readonly sourceType: OperationalSourceType;
  readonly resourceId: string;
  readonly episodeId: string;
  readonly episodeAlias: string;
  readonly sourceState: string;
  readonly administrativeState: OperationalAdministrativeState;
  readonly administrativeRank: number;
  readonly currentResponsibility: string | null;
  readonly configuredAt: Date | null;
  readonly lastEvidenceAt: Date | null;
  readonly sourceUpdatedAt: Date | null;
  readonly inclusionReason: string;
}

function cursorFilter(after: OperationalCursorPosition | null): Prisma.Sql {
  if (!after) return Prisma.empty;
  const tieBreak = Prisma.sql`
    (
      item."sourceType" > ${after.sourceType}
      OR (
        item."sourceType" = ${after.sourceType}
        AND item."resourceId" > ${after.resourceId}
      )
    )
  `;
  const withinRank = after.configuredAt
    ? Prisma.sql`
        item."configuredAt" > ${after.configuredAt}
        OR item."configuredAt" IS NULL
        OR (item."configuredAt" = ${after.configuredAt} AND ${tieBreak})
      `
    : Prisma.sql`item."configuredAt" IS NULL AND ${tieBreak}`;
  return Prisma.sql`
    WHERE item."administrativeRank" > ${after.administrativeRank}
       OR (item."administrativeRank" = ${after.administrativeRank} AND (${withinRank}))
  `;
}

function toItem(row: OperationalRow): OperationalContinuityItem {
  return {
    ...row,
    canonicalHref: canonicalOperationalHref(row.sourceType, row.episodeId),
  };
}

export async function listOperationalContinuity(input: {
  readonly principal: AuthenticatedPrincipal;
  readonly pageSize: number;
  readonly after: OperationalCursorPosition | null;
  readonly now?: Date;
}): Promise<OperationalContinuityPage | null> {
  const now = input.now ?? new Date();
  const professionalRoles = input.principal.roles.filter(
    (role): role is "nurse" | "clinician" => role === "nurse" || role === "clinician",
  );
  if (
    professionalRoles.length === 0 ||
    (await prisma.user.count({
      where: {
        id: input.principal.userId,
        isActive: true,
        roleAssignments: { some: { role: { in: professionalRoles }, revokedAt: null } },
      },
    })) !== 1
  ) {
    return null;
  }

  const taskAssigneeEligible = Prisma.sql`
    task."current_state" = 'open'
    AND task."assigned_to_id" IS NOT NULL
    AND assignee."is_active" = TRUE
    AND EXISTS (
      SELECT 1 FROM "role_assignments" AS assignment_role
      WHERE assignment_role."user_id" = task."assigned_to_id"
        AND assignment_role."revoked_at" IS NULL
        AND (
          (task."assigned_to_id" = episode."responsible_nurse_id" AND assignment_role."role" = 'nurse')
          OR
          (task."assigned_to_id" = episode."responsible_clinician_id" AND assignment_role."role" = 'clinician')
        )
    )
  `;

  const rows = await prisma.$queryRaw<OperationalRow[]>(Prisma.sql`
    WITH authorized_episodes AS (
      SELECT
        episode."id",
        episode."status",
        episode."discharge_date",
        episode."program_length_days",
        episode."responsible_nurse_id",
        episode."responsible_clinician_id",
        episode."created_at",
        episode."updated_at",
        patient."external_pseudonymous_id" AS "episodeAlias",
        CASE
          WHEN nurse."is_active" = TRUE AND EXISTS (
            SELECT 1 FROM "role_assignments" AS nurse_role
            WHERE nurse_role."user_id" = nurse."id"
              AND nurse_role."role" = 'nurse'
              AND nurse_role."revoked_at" IS NULL
          ) THEN nurse."synthetic_alias"
          ELSE NULL
        END AS "nurseCurrentAlias",
        CASE
          WHEN clinician."is_active" = TRUE AND EXISTS (
            SELECT 1 FROM "role_assignments" AS clinician_role
            WHERE clinician_role."user_id" = clinician."id"
              AND clinician_role."role" = 'clinician'
              AND clinician_role."revoked_at" IS NULL
          ) THEN clinician."synthetic_alias"
          ELSE NULL
        END AS "clinicianCurrentAlias"
      FROM "discharge_episodes" AS episode
      INNER JOIN "patients" AS patient ON patient."id" = episode."patient_id"
      INNER JOIN "users" AS nurse ON nurse."id" = episode."responsible_nurse_id"
      INNER JOIN "users" AS clinician ON clinician."id" = episode."responsible_clinician_id"
      WHERE patient."is_synthetic" = TRUE
        AND (
          (
            episode."responsible_nurse_id" = ${input.principal.userId}
            AND EXISTS (
              SELECT 1 FROM "role_assignments" AS actor_nurse_role
              WHERE actor_nurse_role."user_id" = ${input.principal.userId}
                AND actor_nurse_role."role" = 'nurse'
                AND actor_nurse_role."revoked_at" IS NULL
            )
          )
          OR (
            episode."responsible_clinician_id" = ${input.principal.userId}
            AND EXISTS (
              SELECT 1 FROM "role_assignments" AS actor_clinician_role
              WHERE actor_clinician_role."user_id" = ${input.principal.userId}
                AND actor_clinician_role."role" = 'clinician'
                AND actor_clinician_role."revoked_at" IS NULL
            )
          )
        )
    ), operational_items AS (
      SELECT
        'EPISODE'::text AS "sourceType",
        episode."id" AS "resourceId",
        episode."id" AS "episodeId",
        episode."episodeAlias",
        episode."status"::text AS "sourceState",
        CASE
          WHEN episode."status" = 'PAUSED' THEN 'BLOCKED'
          WHEN episode."status" = 'DRAFT' THEN 'PENDING'
          WHEN episode."status" = 'CLOSED' THEN 'RESOLVED'
          ELSE 'RECORDED'
        END::text AS "administrativeState",
        CASE
          WHEN episode."status" = 'PAUSED' THEN 1
          WHEN episode."status" = 'DRAFT' THEN 3
          WHEN episode."status" = 'CLOSED' THEN 7
          ELSE 6
        END::int AS "administrativeRank",
        NULLIF(
          CONCAT_WS(
            ' · ',
            CASE
              WHEN episode."nurseCurrentAlias" IS NOT NULL
                THEN 'Enfermería: ' || episode."nurseCurrentAlias"
              ELSE NULL
            END,
            CASE
              WHEN episode."clinicianCurrentAlias" IS NOT NULL
                THEN 'Profesional clínico: ' || episode."clinicianCurrentAlias"
              ELSE NULL
            END
          ),
          ''
        )::text AS "currentResponsibility",
        (episode."discharge_date"::timestamp AT TIME ZONE 'UTC') AS "configuredAt",
        episode."updated_at" AS "lastEvidenceAt",
        episode."updated_at" AS "sourceUpdatedAt",
        'Episodio incluido por responsabilidad profesional vigente.'::text AS "inclusionReason"
      FROM authorized_episodes AS episode

      UNION ALL

      SELECT
        'CHECK_IN', assignment."id", assignment."episode_id", episode."episodeAlias",
        COALESCE(outcome."type"::text, 'PENDING'),
        CASE
          WHEN outcome."id" IS NOT NULL THEN 'RECORDED'
          WHEN episode."status" <> 'ACTIVE' THEN 'BLOCKED'
          WHEN assignment."window_ends_at" <= ${now} THEN 'TECHNICALLY_OVERDUE'
          ELSE 'PENDING'
        END,
        CASE
          WHEN outcome."id" IS NOT NULL THEN 6
          WHEN episode."status" <> 'ACTIVE' THEN 1
          WHEN assignment."window_ends_at" <= ${now} THEN 2
          ELSE 3
        END,
        NULL::text,
        CASE WHEN outcome."id" IS NULL THEN assignment."window_ends_at" ELSE assignment."scheduled_for" END,
        COALESCE(outcome."recorded_at", assignment."created_at"),
        COALESCE(outcome."recorded_at", assignment."created_at"),
        CASE
          WHEN outcome."id" IS NOT NULL THEN 'Outcome terminal persistido; no demuestra el estado de otra fuente.'
          WHEN episode."status" <> 'ACTIVE' THEN 'Ventana configurada sin actuación disponible porque el episodio no está activo.'
          WHEN assignment."window_ends_at" <= ${now} THEN 'Ventana técnica finalizada sin outcome terminal persistido; no implica incumplimiento.'
          ELSE 'Ventana configurada pendiente; no es un SLA clínico.'
        END
      FROM "check_in_assignments" AS assignment
      INNER JOIN authorized_episodes AS episode ON episode."id" = assignment."episode_id"
      LEFT JOIN "check_in_outcomes" AS outcome ON outcome."assignment_id" = assignment."id"

      UNION ALL

      SELECT
        'RULE_EVALUATION', evaluation."id", evaluation."episode_id", episode."episodeAlias",
        evaluation."outcome"::text,
        CASE WHEN evaluation."outcome" = 'abstained' THEN 'ABSTAINED' ELSE 'RECORDED' END,
        CASE WHEN evaluation."outcome" = 'abstained' THEN 5 ELSE 6 END,
        NULL::text, NULL::timestamptz, evaluation."evaluated_at",
        evaluation."evaluated_at",
        CASE
          WHEN evaluation."outcome" = 'abstained' THEN 'Evaluación determinista abstendida; no equivale a alerta ni revisión.'
          ELSE 'Evaluación determinista registrada; su resultado no acredita revisión ni acción.'
        END
      FROM "rule_evaluations" AS evaluation
      INNER JOIN authorized_episodes AS episode ON episode."id" = evaluation."episode_id"

      UNION ALL

      SELECT
        'ALERT', alert."id", alert."episode_id", episode."episodeAlias",
        alert."current_state"::text,
        CASE
          WHEN alert."current_state" = 'open' AND (
            (alert."review_owner" = 'nurse' AND episode."nurseCurrentAlias" IS NULL)
            OR
            (alert."review_owner" = 'clinician' AND episode."clinicianCurrentAlias" IS NULL)
          ) THEN 'BLOCKED'
          WHEN alert."current_state" = 'open' THEN 'PENDING'
          WHEN alert."current_state" IN ('resolved', 'dismissed-with-reason') THEN 'RESOLVED'
          ELSE 'RECORDED'
        END,
        CASE
          WHEN alert."current_state" = 'open' AND (
            (alert."review_owner" = 'nurse' AND episode."nurseCurrentAlias" IS NULL)
            OR
            (alert."review_owner" = 'clinician' AND episode."clinicianCurrentAlias" IS NULL)
          ) THEN 1
          WHEN alert."current_state" = 'open' THEN 3
          WHEN alert."current_state" IN ('resolved', 'dismissed-with-reason') THEN 7
          ELSE 6
        END,
        CASE
          WHEN alert."current_state" = 'open' AND alert."review_owner" = 'nurse'
            THEN episode."nurseCurrentAlias"
          WHEN alert."current_state" = 'open' AND alert."review_owner" = 'clinician'
            THEN episode."clinicianCurrentAlias"
          ELSE NULL
        END,
        NULL::timestamptz, alert."triggered_at", alert."updated_at",
        CASE
          WHEN alert."current_state" = 'open' AND (
            (alert."review_owner" = 'nurse' AND episode."nurseCurrentAlias" IS NULL)
            OR
            (alert."review_owner" = 'clinician' AND episode."clinicianCurrentAlias" IS NULL)
          ) THEN 'Aviso abierto sin responsable de revisión actualmente elegible; requiere resolución organizativa humana.'
          WHEN alert."current_state" = 'open' THEN 'Aviso pendiente de revisión humana; no es prioridad clínica.'
          ELSE 'Estado administrativo del aviso; no acredita revisión, tarea ni acción clínica.'
        END
      FROM "alerts" AS alert
      INNER JOIN authorized_episodes AS episode ON episode."id" = alert."episode_id"

      UNION ALL

      SELECT
        'ALERT_REVIEW', review."id", alert."episode_id", episode."episodeAlias",
        review."to_state"::text, 'RECORDED', 6, NULL::text,
        NULL::timestamptz, review."reviewed_at", review."reviewed_at",
        'Revisión humana persistida; no equivale a tarea ni a acción clínica.'
      FROM "alert_reviews" AS review
      INNER JOIN "alerts" AS alert ON alert."id" = review."alert_id"
      INNER JOIN authorized_episodes AS episode ON episode."id" = alert."episode_id"

      UNION ALL

      SELECT
        'TASK', task."id", task."episode_id", episode."episodeAlias",
        task."current_state"::text,
        CASE
          WHEN task."current_state" = 'resolved' THEN 'RESOLVED'
          WHEN task."assigned_to_id" IS NULL THEN 'PENDING'
          WHEN NOT (${taskAssigneeEligible}) THEN 'BLOCKED'
          ELSE 'PENDING'
        END,
        CASE
          WHEN task."current_state" = 'resolved' THEN 7
          WHEN task."assigned_to_id" IS NOT NULL AND NOT (${taskAssigneeEligible}) THEN 1
          ELSE 3
        END,
        CASE WHEN ${taskAssigneeEligible} THEN assignee."synthetic_alias" ELSE NULL END,
        NULL::timestamptz, task."updated_at", task."updated_at",
        CASE
          WHEN task."current_state" = 'resolved' THEN 'Tarea resuelta por un flujo humano; no modifica el episodio.'
          WHEN task."assigned_to_id" IS NULL THEN 'Tarea abierta sin asignación actual; no equivale a derivación clínica.'
          WHEN NOT (${taskAssigneeEligible}) THEN 'Tarea abierta con assignee no elegible actualmente; requiere resolución organizativa humana.'
          ELSE 'Tarea abierta con assignee actualmente elegible; la asignación no concede autoridad clínica.'
        END
      FROM "tasks" AS task
      INNER JOIN authorized_episodes AS episode ON episode."id" = task."episode_id"
      LEFT JOIN "users" AS assignee ON assignee."id" = task."assigned_to_id"

      UNION ALL

      SELECT
        'GOVERNANCE_EVIDENCE', episode."id", episode."id", episode."episodeAlias",
        'READ_MODEL_REFERENCE', 'UPDATE_UNKNOWN', 8, NULL::text,
        NULL::timestamptz, NULL::timestamptz, NULL::timestamptz,
        'Referencia a la vista canónica autorizada que se compone bajo demanda; P10 no la ha ejecutado ni precalculado y no demuestra integridad, completitud, aprobación o disponibilidad clínica.'
      FROM authorized_episodes AS episode
    )
    SELECT item.*
    FROM operational_items AS item
    ${cursorFilter(input.after)}
    ORDER BY
      item."administrativeRank" ASC,
      item."configuredAt" ASC NULLS LAST,
      item."sourceType" ASC,
      item."resourceId" ASC
    LIMIT ${input.pageSize + 1}
  `);

  const hasNextPage = rows.length > input.pageSize;
  const values = hasNextPage ? rows.slice(0, input.pageSize) : rows;
  return {
    items: values.map(toItem),
    page: {
      size: input.pageSize,
      returned: values.length,
      hasNextPage,
      truncated: hasNextPage,
    },
    freshness: {
      state: "UPDATE_UNKNOWN",
      generatedAt: now,
      explanation:
        "Fecha de consulta técnica; no existe un umbral trazable que garantice actualidad clínica.",
    },
  };
}
