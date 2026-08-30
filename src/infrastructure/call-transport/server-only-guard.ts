export function assertServerOnlyRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("Server-only outbound call infrastructure cannot run in a browser");
  }
}
