import { PatientHome } from "@/presentation/components/patient-home";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function MyFollowUpPage() {
  const session = await getDemoPageSession();
  return session?.role === "patient" ? <PatientHome /> : <UnauthorizedState />;
}
