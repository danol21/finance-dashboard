import { useEffect, useRef, useState } from "react";
import RetirementPanel from "./components/RetirementPanel";
import AccountsTable from "./components/AccountsTable";
import HealthPanel from "./components/HealthPanel";
import TriggerLog from "./components/TriggerLog";
import ContributionLimitsPanel from "./components/ContributionLimitsPanel";
import QuarterlyChecklist from "./components/QuarterlyChecklist";
import FindingsSync from "./components/FindingsSync";
import { loadData, saveData } from "./lib/storage";
import { seedData } from "./data/seedData";

export default function App() {
  const [data, setData] = useState(() => loadData());
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateSettings = (settings) => setData((d) => ({ ...d, settings }));
  const updateAccounts = (accounts) => setData((d) => ({ ...d, accounts }));
  const updateHealth = (health) => setData((d) => ({ ...d, health }));
  const updateTriggers = (triggers) => setData((d) => ({ ...d, triggers }));
  const updateContributionLimits = (contributionLimits) =>
    setData((d) => ({ ...d, settings: { ...d.settings, contributionLimits } }));
  const updateChecklist = (checklist) => setData((d) => ({ ...d, checklist }));

  const addTriggerFromFinding = (entry) =>
    setData((d) => ({ ...d, triggers: [entry, ...d.triggers] }));

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
          },
          accounts: parsed.accounts ?? [],
          health: { ...data.health, ...parsed.health },
          triggers: parsed.triggers ?? [],
          checklist: { ...seedData.checklist, ...parsed.checklist },
          reviewedFindingIds: parsed.reviewedFindingIds ?? [],
        });
      } catch (err) {
        alert("Could not parse that file as JSON.");
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
          <p className="app-subtitle">Retirement &amp; account tracker</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={exportJson} type="button">
            Export JSON
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Import JSON
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

      <main className="app-main">
        <FindingsSync
          reviewedFindingIds={data.reviewedFindingIds}
          onMarkReviewed={markFindingReviewed}
          onAddTrigger={addTriggerFromFinding}
        />
        <RetirementPanel
          settings={data.settings}
          onChange={updateSettings}
          accounts={data.accounts}
        />
        <AccountsTable accounts={data.accounts} onChange={updateAccounts} />
        <ContributionLimitsPanel
          limits={data.settings.contributionLimits}
          accounts={data.accounts}
          onChange={updateContributionLimits}
        />
        <HealthPanel health={data.health} onChange={updateHealth} />
        <QuarterlyChecklist checklist={data.checklist} onChange={updateChecklist} />
        <TriggerLog triggers={data.triggers} onChange={updateTriggers} />
      </main>

      <footer className="app-footer">
        <p>Data is saved locally in this browser (localStorage). Export a JSON backup periodically.</p>
      </footer>
    </div>
  );
}
