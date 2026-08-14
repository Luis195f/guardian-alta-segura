import { checkGovernanceEvidence } from "./check-governance-evidence.mjs";
import { checkRequirementsTraceability } from "./check-requirements-traceability.mjs";

const requirementsStatus = checkRequirementsTraceability();
const governanceStatus = checkGovernanceEvidence();

process.exitCode = requirementsStatus === 0 && governanceStatus === 0 ? 0 : 1;
