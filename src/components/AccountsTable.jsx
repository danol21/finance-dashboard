import { num, effectiveMonthly, formatCurrency, formatCurrencyPrecise, isElectiveDeferralType } from "../lib/finance";
import { makeId } from "../lib/storage";
import { isDuplicateOfSynced } from "../lib/liveSnapshot";

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
  // A manual account whose name matches a synced one is hidden here (and left
  // out of the totals below) so it never doubles up with its synced version —
  // it's NOT removed from storage, so unhiding it is as simple as renaming it
  // to stop matching. Edits (updateRow/removeRow/addRow) still operate on the
  // full `accounts` list, never this filtered view, so a hidden duplicate is
  // never accidentally dropped by an unrelated edit.
  const visibleManualAccounts = accounts.filter((a) => !isDuplicateOfSynced(a, syncedAccounts));
  const allRows = [...visibleManualAccounts, ...syncedAccounts];
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
              <th title="Account label. For a synced row this comes from Truthifi — a manual account whose name matches (even partially) is automatically hidden below to avoid double-counting.">
                Name
              </th>
              <th title="Where the account is held.">Institution</th>
              <th title="Tax treatment of the account. Drives which panels apply — e.g. only 401(k)/403(b) get an employee/employer contribution split, and only Traditional/Roth IRA count toward the IRA limit.">
                Type
              </th>
              <th title="Ticker of the fund held here (e.g. FZROX). Used by Fund & Fee Review to look up its expense ratio.">
                Fund
              </th>
              <th className="col-num" title="Current balance. Synced rows update automatically from Truthifi; manual rows need to be updated by hand.">
                Balance
              </th>
              <th className="col-num" title="Monthly contribution used in the Retirement Projection. 401(k)/403(b) split into EE (your contribution) and ER (employer match); Truthifi can't see this, so it's always entered/edited here even for synced accounts.">
                Monthly
              </th>
              <th title="Free-text notes.">Notes</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {visibleManualAccounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <input
                    className="cell-input"
                    value={a.name}
                    onChange={(e) => updateRow(a.id, "name", e.target.value)}
                    placeholder="Account name"
                    title={a.name || undefined}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.institution}
                    onChange={(e) => updateRow(a.id, "institution", e.target.value)}
                    placeholder="Institution"
                    title={a.institution || undefined}
                  />
                </td>
                <td>
                  <select
                    className="cell-input"
                    value={a.type}
                    onChange={(e) => updateRow(a.id, "type", e.target.value)}
                    title="Tax treatment of this account — controls which limit/panel it counts toward."
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
                    title="Current balance — update by hand for accounts not synced via Truthifi."
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
                      title="Total monthly amount going into this account, used in the Retirement Projection."
                    />
                  )}
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.notes}
                    onChange={(e) => updateRow(a.id, "notes", e.target.value)}
                    placeholder="Notes"
                    title={a.notes || undefined}
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
                  <input
                    className="cell-input"
                    value={a.name}
                    disabled
                    title={`${a.name} — synced via Truthifi. Rename or remove a manual account with a matching name to change what's hidden here.`}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.institution}
                    disabled
                    title="Managed automatically from your Truthifi connection, not editable here."
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={a.type}
                    disabled
                    title={`Inferred from the account name as ${a.type}. If that's wrong, this account's Contribution Limits / elective-deferral handling will be wrong too — flag it for a fix.`}
                  />
                </td>
                <td>
                  <input className="cell-input" value={a.fund} disabled title={a.fund || "No holdings reported."} />
                </td>
                <td className="col-num">
                  <input
                    className="cell-input cell-num"
                    value={formatCurrencyPrecise(num(a.balance))}
                    disabled
                    title="Live balance from Truthifi, updated on each sync."
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
                          onChange={(e) => onUpdateSyncedContribution(a.accountId, "employeeMonthly", e.target.value)}
                          placeholder="0.00"
                          title="Your own contribution (pre-tax + Roth combined), estimated monthly from past transactions. If you've changed your contribution % recently in ADP/Voya, this may still show the OLD amount until enough new paychecks build up a new pattern — overwrite it here to keep this accurate now."
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
                          title="Employer match / Safe Harbor, estimated monthly from past transactions. This moves with your own contribution % (it's a dollar-for-dollar match up to the cap) — if you reduce your %, this drops too, so update it here if it looks stale."
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
              <td
                colSpan={4}
                className="totals-label"
                title="Sum of every account below — manual accounts hidden as duplicates of a synced account are excluded, so this won't double-count."
              >
                Totals
              </td>
              <td className="col-num totals-value" title="Sum of all account balances.">
                {formatCurrency(totalBalance)}
              </td>
              <td className="col-num totals-value" title="Sum of all monthly contributions (employee + employer where applicable).">
                {formatCurrencyPrecise(totalMonthly)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
