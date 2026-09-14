import { useState } from "react";
import { formatCurrency, formatCurrencyPrecise } from "../lib/finance";

function formatSyncedAt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function LiveSnapshotPanel({ status, snapshot, onLogin, onLogout }) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const result = await onLogin(password);
    if (result.ok) {
      setPassword("");
    } else {
      setLoginError(result.error ?? "Login failed");
    }
    setLoggingIn(false);
  };

  if (status === "loading") return null;

  if (status === "unavailable") {
    return (
      <section className="panel">
        <h2 className="panel-title">Live Portfolio Snapshot</h2>
        <p className="empty-state">
          Live sync isn't available here — this feature only works on the deployed site, where the
          monthly automation pushes a snapshot for you to view.
        </p>
      </section>
    );
  }

  if (status === "needs-login") {
    return (
      <section className="panel">
        <h2 className="panel-title">Live Portfolio Snapshot</h2>
        <p className="fund-caption">
          Sign in to view the latest synced balances and diagnostics from Truthifi, and to feed
          them into your Retirement Projection and Fund &amp; Fee Review below.
        </p>
        <form className="snapshot-login" onSubmit={handleLogin}>
          <input
            type="password"
            className="cell-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button className="btn btn-ghost" type="submit" disabled={loggingIn || !password}>
            {loggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {loginError && <p className="snapshot-login-error">{loginError}</p>}
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="panel">
        <div className="panel-header-row">
          <h2 className="panel-title">Live Portfolio Snapshot</h2>
          <button className="btn btn-ghost" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>
        <p className="empty-state">
          No snapshot yet — the monthly automation hasn't pushed one. Check back after its next run.
        </p>
      </section>
    );
  }

  const { syncedAt, accounts = [], diagnostics = {} } = snapshot;

  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Live Portfolio Snapshot</h2>
        <button className="btn btn-ghost" onClick={onLogout} type="button">
          Sign out
        </button>
      </div>
      <p className="fund-caption">
        Last synced {formatSyncedAt(syncedAt)} — balances below now feed your Retirement Projection
        and Fund &amp; Fee Review automatically.
      </p>

      {(diagnostics.idleCashPct !== undefined ||
        diagnostics.alphaVsBenchmarkPct !== undefined ||
        diagnostics.totalFeesTrailingYear !== undefined) && (
        <div className="retire-results" style={{ marginBottom: "1.5rem" }}>
          {diagnostics.idleCashPct !== undefined && (
            <div
              className="stat"
              title="Share of your Traditional IRA + Roth IRA + 401(k) balance sitting in cash or a money-market fund instead of invested. Cash doesn't benefit from tax-advantaged compounding, so lower is generally better here."
            >
              <span className="stat-label">Idle cash (tax-advantaged accounts)</span>
              <span className="stat-value">{diagnostics.idleCashPct.toFixed(1)}%</span>
            </div>
          )}
          {diagnostics.alphaVsBenchmarkPct !== undefined && (
            <div
              className={`stat ${diagnostics.alphaVsBenchmarkPct >= 0 ? "stat-positive" : "stat-negative"}`}
              title="How your actual trailing-12-month return compares to a benchmark with a similar stock/bond mix. Negative (red) means you returned less than that benchmark over the period; positive (green) means you beat it. This reflects your whole portfolio, not any single fund — see the note below for what's actually driving it."
            >
              <span className="stat-label">Alpha vs. benchmark (trailing 12mo)</span>
              <span className="stat-value">
                {diagnostics.alphaVsBenchmarkPct >= 0 ? "+" : ""}
                {diagnostics.alphaVsBenchmarkPct.toFixed(1)}%
              </span>
            </div>
          )}
          {diagnostics.totalFeesTrailingYear !== undefined && (
            <div
              className="stat"
              title="Total account and fund fees actually charged across all linked accounts over the trailing 12 months, as reported by Truthifi. Doesn't include expense ratios Truthifi can't see for certain institutional/401(k) funds — see Fund & Fee Review below for what's known there."
            >
              <span className="stat-label">Total fees (trailing 12mo)</span>
              <span className="stat-value">{formatCurrencyPrecise(diagnostics.totalFeesTrailingYear)}</span>
            </div>
          )}
        </div>
      )}
      {diagnostics.notes && <p className="snapshot-notes">{diagnostics.notes}</p>}

      {accounts.length > 0 && (
        <div className="fund-holdings" style={{ marginTop: "1rem" }}>
          {accounts.map((account) =>
            (account.holdings ?? []).map((h) => (
              <div key={`${account.accountId}-${h.symbol}`} className="fund-row">
                <span className="fund-ticker">{h.symbol}</span>
                <span className="fund-name">{h.securityName ?? account.name}</span>
                <span className="fund-account">{account.name}</span>
                <span className="fund-er" />
                <span className="fund-fee">{formatCurrency(h.balance)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
