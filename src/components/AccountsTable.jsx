import { num, effectiveMonthly, formatCurrency, formatCurrencyPrecise, isElectiveDeferralType } from "../lib/finance";
import { makeId } from "../lib/storage";

const ACCOUNT_TYPES = [
  "Brokerage",
  "Traditional IRA",
  "Roth IRA",
  "401(k)",
  "403(b)",
  "HSA",
  "UK Pension",
  "Cash / Savings",
  "Other",
];

export default function AccountsTable({ accounts, onChange, syncedAccounts = [], onUpdateSyncedContribution }) {
  const allRows = [...accounts, ...syncedAccounts];
  const totalBalance = allRows.reduce((sum, a) => sum + num(a.balance), 0);
  const totalMonthly = allRows.reduce((sum, a) => sum + effectiveMonthly(a), 0);

  const updateRow = (id, field, value) => {
    onChange(accounts.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const addRow = () => {
    onChange([
      ...accounts,
      {
        id: makeId("acct"),
        name: "",
        institution: "",
        type: ACCOUNT_TYPES[0],
        fund: "",
        balance: "",
        monthly: "",
        notes: "",
      },
    ]);
  };

  const removeRow = (id) => {
    onChange(accounts.filter((a) => a.id !== id));
  };

  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Accounts</h2>
        <button className="btn btn-ghost" onClick={addRow} type="button">
          + Add account
        </button>
      </div>

      {syncedAccounts.length > 0 && (
        <p className="fund-caption">
          Accounts synced from your Live Portfolio Snapshot appear below (grayed out) with their
          balance and fund managed automatically — enter their monthly contribution here since
          Truthifi can't see that. Manually-added accounts with the same name are hidden to avoid
          double-counting.
        </p>
      )}

      <div className="table-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Institution</th>
              <th>Type</th>
              <th>Fund</th>
              <th className="col-num">Balance</th>
              <th className="col-num">Monthly</th>
              <th>Notes</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <input
                    className="cell-input"
                    value={a.name}
                    onChange={(e) => updateRow(a.id, "name", e.target.value)}
                    placeholder="Account name"
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.institution}
                    onChange={(e) => updateRow(a.id, "institution", e.target.value)}
                    placeholder="Institution"
                  />
                </td>
                <td>
                  <select
                    className="cell-input"
                    value={a.type}
                    onChange={(e) => updateRow(a.id, "type", e.target.value)}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.fund ?? ""}
                    onChange={(e) => updateRow(a.id, "fund", e.target.value.toUpperCase())}
                    placeholder="e.g. FZROX"
                    title="Ticker of the fund held in this account, for the Fund & Fee Review panel"
                  />
                </td>
                <td className="col-num">
                  <input
                    className="cell-input cell-num"
                    inputMode="decimal"
                    value={a.balance}
                    onChange={(e) => updateRow(a.id, "balance", e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td className="col-num">
                  {isElectiveDeferralType(a.type) ? (
                    <div className="split-monthly">
                      <div className="split-monthly-row">
                        <span className="split-monthly-label">EE</span>
                        <input
                          className="cell-input cell-num"
                          inputMode="decimal"
                          value={a.employeeMonthly ?? ""}
                          onChange={(e) => updateRow(a.id, "employeeMonthly", e.target.value)}
                          placeholder="0.00"
                          title="Employee contribution (pre-tax + Roth)"
                        />
                      </div>
                      <div className="split-monthly-row">
                        <span className="split-monthly-label">ER</span>
                        <input
                          className="cell-input cell-num"
                          inputMode="decimal"
                          value={a.employerMonthly ?? ""}
                          onChange={(e) => updateRow(a.id, "employerMonthly", e.target.value)}
                          placeholder="0.00"
                          title="Employer match / Safe Harbor"
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      className="cell-input cell-num"
                      inputMode="decimal"
                      value={a.monthly}
                      onChange={(e) => updateRow(a.id, "monthly", e.target.value)}
                      placeholder="0.00"
                    />
                  )}
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.notes}
                    onChange={(e) => updateRow(a.id, "notes", e.target.value)}
                    placeholder="Notes"
                  />
                </td>
                <td>
                  <button
                    className="btn btn-icon"
                    onClick={() => removeRow(a.id)}
                    type="button"
                    aria-label="Remove account"
                    title="Remove account"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {syncedAccounts.map((a) => (
              <tr key={a.id} className="ledger-row-synced">
                <td>
                  <input className="cell-input" value={a.name} disabled title="Synced via Truthifi" />
                </td>
                <td>
                  <input className="cell-input" value={a.institution} disabled />
                </td>
                <td>
                  <input className="cell-input" value={a.type} disabled />
                </td>
                <td>
                  <input className="cell-input" value={a.fund} disabled title={a.fund} />
                </td>
                <td className="col-num">
                  <input className="cell-input cell-num" value={formatCurrencyPrecise(num(a.balance))} disabled />
                </td>
                <td className="col-num">
                  {isElectiveDeferralType(a.type) ? (
                    <div className="split-monthly">
                      <div className="split-monthly-row">
                        <span className="split-monthly-label">EE</span>
                        <input
                          className="cell-input cell-num"
                          inputMode="decimal"
                          value={a.employeeMonthly ?? ""}
                          onChange={(e) => onUpdateSyncedContribution(a.accountId, "employeeMonthly", e.target.value)}
                          placeholder="0.00"
                          title="Employee contribution (pre-tax + Roth)"
                        />
                      </div>
                      <div className="split-monthly-row">
                        <span className="split-monthly-label">ER</span>
                        <input
                          className="cell-input cell-num"
                          inputMode="decimal"
                          value={a.employerMonthly ?? ""}
                          onChange={(e) => onUpdateSyncedContribution(a.accountId, "employerMonthly", e.target.value)}
                          placeholder="0.00"
                          title="Employer match / Safe Harbor"
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      className="cell-input cell-num"
                      inputMode="decimal"
                      value={a.monthly ?? ""}
                      onChange={(e) => onUpdateSyncedContribution(a.accountId, "monthly", e.target.value)}
                      placeholder="0.00"
                    />
                  )}
                </td>
                <td>
                  <input className="cell-input" value={a.notes} disabled title={a.notes} />
                </td>
                <td />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="totals-label">
                Totals
              </td>
              <td className="col-num totals-value">{formatCurrency(totalBalance)}</td>
              <td className="col-num totals-value">{formatCurrencyPrecise(totalMonthly)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
