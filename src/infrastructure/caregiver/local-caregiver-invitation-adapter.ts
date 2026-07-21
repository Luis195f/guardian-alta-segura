import { randomBytes } from "node:crypto";

import type {
  CaregiverPseudonymIssuer,
  LocalCaregiverInvitationAdapter,
} from "@/application/ports/caregiver-access-unit-of-work";

export const localCaregiverInvitationAdapter: LocalCaregiverInvitationAdapter = {
  async deliver(input) {
    // Adaptador local: no envía email, SMS ni push. El token solo vuelve a la UI demo que lo creó.
    return { localAcceptanceToken: input.rawToken };
  },
};

export const randomCaregiverPseudonymIssuer: CaregiverPseudonymIssuer = {
  issue() {
    return `cg_${randomBytes(12).toString("hex")}`;
  },
};
