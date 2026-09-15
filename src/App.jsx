import { useEffect, useRef, useState } from "react";
import NextStepsPanel from "./components/NextStepsPanel";
import RetirementPanel from "./components/RetirementPanel";
import AccountsTable from "./components/AccountsTable";
import HealthPanel from "./components/HealthPanel";
import TriggerLog from "./components/TriggerLog";
import ContributionLimitsPanel from "./components/ContributionLimitsPanel";
import QuarterlyChecklist from "./components/QuarterlyChecklist";
import FindingsSync from "./components/FindingsSync";
import SourcesPanel from "./components/SourcesPanel";
import RemindersPanel from "./components/RemindersPanel";
import GlidePathPanel from "./components/GlidePathPanel";
import FundFeePanel from "./components/FundFeePanel";
import LiveSnapshotPanel from "./components/LiveSnapshotPanel";
import { loadData, saveData } from "./lib/storage";
import { seedData } from "./data/seedData";
import { deriveSyncedAccounts, deriveSnapshotHoldingRows, mergeAccounts } from "./lib/liveSnapshot";
import { worstContributionSuggestion } from "./lib/contributionLimits";
import { mergeSourceActivity } from "./lib/sourceActivity";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "retirement", label: "Retirement Plan" },
  { id: "accounts", label: "Accounts & Fees" },
  { id: "contributions", label: "Contributions & Health" },
  { id: "activity", label: "Activity Log" },
];

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [activeTab, setActiveTab] = useState("overview");
  const fileInputRef = useRef(null);

  const [snapshotStatus, setSnapshotStatus] = useState("loading");
  const [snapshot, setSnapshot] = useState(null);

  const fetchSnapshot = async () => {
    try {
      const res = await fetch("/api/snapshot", { credentials: "include" });
      if (res.status === 401) {
        setSnapshotStatus("needs-login");
        setSnapshot(null);
        return;
      }
      if (!res.ok) {
        setSnapshotStatus("unavailable");
        return;
      }
      const body = await res.json();
      setSnapshot(body);
      setSnapshotStatus("ready");
    } catch {
      // Most likely running locally, where /api routes don't exist.
      setSnapshotStatus("unavailable");
    }
  };

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnapshotLogin = async (password) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.error ?? "Login failed" };
      }
      await fetchSnapshot();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server." };
    }
  };

  const handleSnapshotLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setSnapshot(null);
    setSnapshotStatus("needs-login");
  };

  const syncedAccounts = deriveSyncedAccounts(snapshot, data.syncedContributions);
  const effectiveAccounts = mergeAccounts(data.accounts, syncedAccounts);
  const snapshotHoldings = deriveSnapshotHoldingRows(snapshot);
  const contributionSuggestion = worstContributionSuggestion(data.settings.contributionLimits, effectiveAccounts);

  const updateSyncedContribution = (accountId, field, value) =>
    setData((d) => ({
      ...d,
      syncedContributions: {
        ...d.syncedContributions,
        [accountId]: { ...d.syncedContributions?.[accountId], [field]: value },
      },
    }));

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateSettings = (settings) => setData((d) => ({ ...d, settings }));
  const updateAccounts = (accounts) => setData((d) => ({ ...d, accounts }));
  const updateHealth = (health) => setData((d) => ({ ...d, health }));
  const updateTriggers = (triggers) => setData((d) => ({ ...d, triggers }));
  const updateContributionLimits = (contributionLimits) =>
    setData((d) => ({ ...d, settings: { ...d.settings, contributionLimits } }));
  const updateGlidePath = (glidePath) =>
    setData((d) => ({ ...d, settings: { ...d.settings, glidePath } }));
  const updateChecklist = (checklist) => setData((d) => ({ ...d, checklist }));
  const updateReminders = (reminders) => setData((d) => ({ ...d, reminders }));

  const addTriggerFromFinding = (entry) =>
    setData((d) => ({ ...d, triggers: [entry, ...d.triggers] }));

  const handleSyncComplete = (results, syncedAt) =>
    setData((d) => ({ ...d, sourceActivity: mergeSourceActivity(d.sourceActivity, results, syncedAt) }));

  const markFindingReviewed = (id) =>
    setData((d) => ({
      ...d,
      reviewedFindingIds: d.reviewedFindingIds.includes(id)
        ? d.reviewedFindingIds
        : [...d.reviewedFindingIds, id],
    }));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData({
          settings: {
            ...data.settings,
            ...parsed.settings,
            contributionLimits: {
              ...seedData.settings.contributionLimits,
              ...parsed.settings?.contributionLimits,
            },
            glidePath: {
              ...seedData.settings.glidePath,
              ...parsed.settings?.glidePath,
            },
          },
          accounts: parsed.accounts ?? data.accounts,
          health: { ...data.health, ...parsed.health },
          triggers: parsed.triggers ?? data.triggers,
          checklist: { ...seedData.checklist, ...parsed.checklist },
          reviewedFindingIds: parsed.reviewedFindingIds ?? data.reviewedFindingIds,
          syncedContributions: { ...data.syncedContributions, ...parsed.syncedContributions },
          sourceActivity: { ...data.sourceActivity, ...parsed.sourceActivity },
          reminders: parsed.reminders ?? data.reminders,
        });
      } catch (err) {
        alert("That doesn't look like a backup file this dashboard made — nothing was changed.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">The Ledger</h1>
          <p className="app-subtitle">Your retirement &amp; account tracker</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={exportJson}
            type="button"
            title="Saves a backup file of everything on this dashboard — accounts, settings, reminders, and your history log — to your computer. Keep it somewhere safe; you can load it back in later or on another device."
          >
            Save a backup
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title="Load a backup file you saved earlier, replacing everything currently on this dashboard with what's in that file."
          >
            Load a backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={importJson}
          />
        </div>
      </header>

      <nav className="tab-bar" role="tablist" aria-label="Dashboard sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-button ${activeTab === tab.id ? "tab-button-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        <div className="tab-panel" hidden={activeTab !== "overview"}>
          <NextStepsPanel
            reminders={data.reminders}
            triggers={data.triggers}
            contributionSuggestion={contributionSuggestion}
            health={data.health}
          />
          <RemindersPanel reminders={data.reminders} onChange={updateReminders} />
          <LiveSnapshotPanel
            status={snapshotStatus}
            snapshot={snapshot}
            onLogin={handleSnapshotLogin}
            onLogout={handleSnapshotLogout}
          />
        </div>

        <div className="tab-panel" hidden={activeTab !== "retirement"}>
          <RetirementPanel
            settings={data.settings}
            onChange={updateSettings}
            accounts={effectiveAccounts}
          />
          <GlidePathPanel
            settings={data.settings}
            glidePath={data.settings.glidePath}
            onChange={updateGlidePath}
          />
        </div>

        <div className="tab-panel" hidden={activeTab !== "accounts"}>
          <AccountsTable
            accounts={data.accounts}
            onChange={updateAccounts}
            syncedAccounts={syncedAccounts}
            onUpdateSyncedContribution={updateSyncedContribution}
          />
          <FundFeePanel
            accounts={data.accounts}
            snapshotHoldings={snapshotHoldings}
            settings={data.settings}
          />
        </div>

        <div className="tab-panel" hidden={activeTab !== "contributions"}>
          <ContributionLimitsPanel
            limits={data.settings.contributionLimits}
            accounts={effectiveAccounts}
            onChange={updateContributionLimits}
          />
          <HealthPanel
            health={data.health}
            onChange={updateHealth}
            triggers={data.triggers}
            contributionSuggestion={contributionSuggestion}
          />
          <QuarterlyChecklist checklist={data.checklist} onChange={updateChecklist} />
        </div>

        <div className="tab-panel" hidden={activeTab !== "activity"}>
          <FindingsSync
            reviewedFindingIds={data.reviewedFindingIds}
            onMarkReviewed={markFindingReviewed}
            onAddTrigger={addTriggerFromFinding}
            onSyncComplete={handleSyncComplete}
          />
          <TriggerLog triggers={data.triggers} onChange={updateTriggers} />
          <SourcesPanel sourceActivity={data.sourceActivity} triggers={data.triggers} />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Everything you type here is saved only in this browser, on this device — it isn't backed
          up anywhere else automatically. Click "Save a backup" above every so often, just in case.
        </p>
      </footer>
    </div>
  );
}
