import { useState } from "react";
import { EntryPage } from "../../features/entry/pages/EntryPage";
import { AgentPage } from "../../features/agent/pages/AgentPage";

type Page = "code" | "agent";

export function AppRoutes() {
  const [page, setPage] = useState<Page>("code");

  return (
    <>
      <div style={{ display: page === "code" ? undefined : "none" }}>
        <EntryPage onAgentNav={() => setPage("agent")} />
      </div>
      <div style={{ display: page === "agent" ? undefined : "none" }}>
        <AgentPage onCodeNav={() => setPage("code")} />
      </div>
    </>
  );
}
