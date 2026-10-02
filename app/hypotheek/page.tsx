"use client";

import { useEffect, useMemo, useState } from "react";

type Debt = { id: string; name: string; currentBalance: string | number; interestRate: string | number | null; monthlyPayment: string | number | null };
type LoanPart = { id: string; name: string; loanType: string; originalPrincipal: string | number; currentBalance: string | number; interestRate: string | number; monthlyPayment: string | number | null; startDate: string; endDate: string | null };
type History = { id: string; date: string; totalBalance: string | number; note: string | null };
type Extra = { id: string; name: string | null; frequency: "ONE_TIME" | "MONTHLY"; amount: string | number; startDate: string; endDate: string | null; note: string | null };
type Mortgage = { id: string; name: string; debt: Debt; loanParts: LoanPart[]; balanceHistory: History[]; extraPayments: Extra[] };
const money = (v: string | number | null | undefined) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(v ?? 0));
const dateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const inputStyle: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 7, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", border: 0, borderRadius: 7, background: "#2563eb", color: "white", cursor: "pointer", fontWeight: 600 };

export default function HypotheekPage() {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [availableDebts, setAvailableDebts] = useState<Debt[]>([]);
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [linkName, setLinkName] = useState("Mijn hypotheek");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [extraAmount, setExtraAmount] = useState("100");
  const [extraFrequency, setExtraFrequency] = useState<"MONTHLY" | "ONE_TIME">("MONTHLY");
  const [extraStart, setExtraStart] = useState(dateInput());
  const [extraEnd, setExtraEnd] = useState("");
  const [extraName, setExtraName] = useState("Extra aflossing");
  const [historyDate, setHistoryDate] = useState(dateInput());
  const [historyBalance, setHistoryBalance] = useState("");
  const [historyNote, setHistoryNote] = useState("");
  const [partName, setPartName] = useState("Hypotheekdeel");
  const [partType, setPartType] = useState("ANNUITY");
  const [partOriginal, setPartOriginal] = useState("");
  const [partBalance, setPartBalance] = useState("");
  const [partRate, setPartRate] = useState("");
  const [partPayment, setPartPayment] = useState("");
  const [partStart, setPartStart] = useState(dateInput());
  const [forecastExtra, setForecastExtra] = useState("0");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/mortgage"); const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ophalen mislukt.");
      setMortgages(data.mortgages ?? (data.mortgage ? [data.mortgage] : [])); setAvailableDebts(data.availableDebts ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Er ging iets mis."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function send(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/mortgage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Opslaan mislukt.");
      setNotice("Opgeslagen."); await load(); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Er ging iets mis."); return false; } finally { setBusy(false); }
  }
  async function remove(mortgageId: string, action: string, id: string) {
    if (!window.confirm("Weet je zeker dat je dit onderdeel wilt verwijderen?")) return;
    await send({ action, mortgageId, id });
  }
  const totalBalance = mortgages.reduce((s, m) => s + Number(m.debt.currentBalance || 0), 0);
  const totalPayment = mortgages.reduce((s, m) => s + Number(m.debt.monthlyPayment || 0), 0);
  const forecast = useMemo(() => mortgages.map((m) => {
    let balance = Number(m.debt.currentBalance || 0); const rate = Number(m.debt.interestRate || 0) / 1200;
    const regular = Number(m.debt.monthlyPayment || 0); const extra = Math.max(0, Number(forecastExtra || 0));
    let months = 0, interestTotal = 0;
    while (balance > 0.005 && months < 1200 && regular + extra > 0) {
      const interest = balance * rate; interestTotal += interest;
      const payment = Math.min(balance + interest, regular + extra);
      balance = Math.max(0, balance + interest - payment); months++;
    }
    return { id: m.id, name: m.debt.name, months, interestTotal, payoff: balance <= 0.005 && months > 0, balance, regular, rate: Number(m.debt.interestRate || 0) };
  }), [mortgages, forecastExtra]);

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24, color: "var(--foreground)" }}>
    <header style={{ marginBottom: 24 }}><h1 style={{ fontSize: 30, fontWeight: 750, marginBottom: 6 }}>Hypotheek</h1><p style={{ color: "var(--muted-foreground)" }}>Beheer actuele hypotheekschuld, leningdelen, saldohistorie en extra aflossingen.</p></header>
    {error && <div role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 14 }}>{error}</div>}
    {notice && <div style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8, marginBottom: 14 }}>{notice}</div>}
    {loading ? <p>Hypotheekgegevens laden…</p> : <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 26 }}>
        {[{ label: "Totale hypotheekschuld", value: money(totalBalance) }, { label: "Bekende maandlasten", value: money(totalPayment) }, { label: "Gekoppelde schulden", value: String(mortgages.length) }].map((x) => <div key={x.label} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 18 }}><div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{x.label}</div><strong style={{ fontSize: 23 }}>{x.value}</strong></div>)}
      </section>
      {mortgages.map((m) => <section key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{m.debt.name}</h2><p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>{m.name} · Actueel saldo is gekoppeld aan de bestaande Finwise-schuld en wordt niet dubbel geteld.</p>
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void send({ action: "updateMortgage", mortgageId: m.id, name: f.get("name"), currentBalance: f.get("balance"), interestRate: f.get("rate"), monthlyPayment: f.get("payment") }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, alignItems: "end", marginBottom: 18 }}>
          <label>Naam<input name="name" defaultValue={m.name} style={inputStyle}/></label><label>Actueel saldo (€)<input name="balance" type="number" min="0" step="0.01" defaultValue={m.debt.currentBalance} required style={inputStyle}/></label><label>Rente (%)<input name="rate" type="number" min="0" step="0.0001" defaultValue={m.debt.interestRate ?? ""} style={inputStyle}/></label><label>Maandlast (€)<input name="payment" type="number" min="0" step="0.01" defaultValue={m.debt.monthlyPayment ?? ""} style={inputStyle}/></label><button style={buttonStyle} disabled={busy}>Gegevens bijwerken</button>
        </form>
        <h3 style={{ fontWeight: 650, margin: "14px 0 8px" }}>Hypotheekdelen / voorwaarden</h3>
        {m.loanParts.length ? <div style={{ overflowX: "auto", marginBottom: 12 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><thead><tr>{["Naam", "Type", "Startbedrag", "Saldo (informatief)", "Rente", "Maandlast", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr></thead><tbody>{m.loanParts.map((p) => <tr key={p.id}>{[p.name, p.loanType === "ANNUITY" ? "Annuïtair" : p.loanType === "LINEAR" ? "Lineair" : "Aflossingsvrij", money(p.originalPrincipal), money(p.currentBalance), `${p.interestRate}%`, p.monthlyPayment == null ? "—" : money(p.monthlyPayment)].map((v, i) => <td key={i} style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>{v}</td>)}<td><button onClick={() => void remove(m.id, "deleteLoanPart", p.id)} style={{ ...buttonStyle, background: "#b91c1c", padding: "6px 9px" }}>Verwijder</button></td></tr>)}</tbody></table><small style={{ color: "var(--muted-foreground)" }}>Leningdeelsaldi zijn alleen detailinformatie; het actuele saldo hierboven blijft leidend voor het nettovermogen.</small></div> : <p style={{ color: "var(--muted-foreground)" }}>Nog geen leningdelen vastgelegd.</p>}
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void send({ action: "createLoanPart", mortgageId: m.id, name: f.get("partName"), loanType: f.get("partType"), originalPrincipal: f.get("original"), currentBalance: f.get("partBalance"), interestRate: f.get("partRate"), monthlyPayment: f.get("partPayment"), startDate: f.get("partStart") }); e.currentTarget.reset(); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 22 }}>
          <input name="partName" placeholder="Naam leningdeel" required style={inputStyle}/><select name="partType" style={inputStyle}><option value="ANNUITY">Annuïtair</option><option value="LINEAR">Lineair</option><option value="INTEREST_ONLY">Aflossingsvrij</option></select><input name="original" type="number" min="0.01" step="0.01" placeholder="Oorspronkelijk €" required style={inputStyle}/><input name="partBalance" type="number" min="0" step="0.01" placeholder="Saldo €" required style={inputStyle}/><input name="partRate" type="number" min="0" step="0.0001" placeholder="Rente %" required style={inputStyle}/><input name="partPayment" type="number" min="0" step="0.01" placeholder="Maandlast €" style={inputStyle}/><input name="partStart" type="date" defaultValue={dateInput()} required style={inputStyle}/><button style={buttonStyle} disabled={busy}>Leningdeel toevoegen</button>
        </form>
        <h3 style={{ fontWeight: 650, margin: "14px 0 8px" }}>Extra aflossingen</h3>
        {m.extraPayments.length ? <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{m.extraPayments.map((x) => <li key={x.id} style={{ marginBottom: 7 }}>{x.name || "Extra aflossing"}: {money(x.amount)} · {x.frequency === "MONTHLY" ? "maandelijks" : "eenmalig"} vanaf {dateInput(x.startDate)}{x.endDate ? ` t/m ${dateInput(x.endDate)}` : ""} <button onClick={() => void remove(m.id, "deleteExtraPayment", x.id)} style={{ marginLeft: 8, color: "#b91c1c", background: "transparent", border: 0, cursor: "pointer" }}>Verwijderen</button></li>)}</ul> : <p style={{ color: "var(--muted-foreground)" }}>Nog geen extra aflossingen ingevoerd.</p>}
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void send({ action: "createExtraPayment", mortgageId: m.id, name: f.get("extraName"), frequency: f.get("frequency"), amount: f.get("amount"), startDate: f.get("start"), endDate: f.get("end") || null }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 22 }}><input name="extraName" defaultValue="Extra aflossing" placeholder="Omschrijving" style={inputStyle}/><select name="frequency" value={extraFrequency} onChange={(e) => setExtraFrequency(e.target.value as "MONTHLY" | "ONE_TIME")} style={inputStyle}><option value="MONTHLY">Maandelijks</option><option value="ONE_TIME">Eenmalig</option></select><input name="amount" type="number" min="0.01" step="0.01" defaultValue="100" placeholder="Bedrag €" required style={inputStyle}/><input name="start" type="date" defaultValue={dateInput()} required style={inputStyle}/><input name="end" type="date" aria-label="Einddatum (optioneel)" style={inputStyle}/><button style={buttonStyle} disabled={busy}>Aflossing toevoegen</button></form>
        <h3 style={{ fontWeight: 650, margin: "14px 0 8px" }}>Saldohistorie</h3>
        {m.balanceHistory.length ? <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{m.balanceHistory.map((h) => <li key={h.id} style={{ marginBottom: 6 }}>{dateInput(h.date)} — {money(h.totalBalance)} {h.note ? `· ${h.note}` : ""} <button onClick={() => void remove(m.id, "deleteHistory", h.id)} style={{ marginLeft: 8, color: "#b91c1c", background: "transparent", border: 0, cursor: "pointer" }}>Verwijderen</button></li>)}</ul> : <p style={{ color: "var(--muted-foreground)" }}>Nog geen historische saldi.</p>}
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void send({ action: "createHistory", mortgageId: m.id, date: f.get("date"), totalBalance: f.get("historyBalance"), note: f.get("note") }); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}><input name="date" type="date" defaultValue={dateInput()} required style={inputStyle}/><input name="historyBalance" type="number" min="0" step="0.01" placeholder="Saldo op datum €" required style={inputStyle}/><input name="note" placeholder="Notitie (optioneel)" style={inputStyle}/><button style={buttonStyle} disabled={busy}>Saldomoment opslaan</button></form>
      </section>)}
      {availableDebts.length > 0 && <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 18 }}><h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Bestaande hypotheekschuld koppelen</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 }}><select value={selectedDebtId} onChange={(e) => setSelectedDebtId(e.target.value)} style={inputStyle}><option value="">Selecteer schuld…</option>{availableDebts.map((d) => <option key={d.id} value={d.id}>{d.name} — {money(d.currentBalance)}</option>)}</select><input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Weergavenaam" style={inputStyle}/><button style={buttonStyle} disabled={busy || !selectedDebtId} onClick={() => void send({ debtId: selectedDebtId, name: linkName })}>Koppelen</button></div></section>}
      <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}><h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Indicatieve aflossingsprognose</h2><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 12 }}>Rekent met het huidige saldo, de geregistreerde rente en maandlast, plus een extra maandbedrag. Geen fiscale effecten of renteherzieningen inbegrepen.</p><label style={{ display: "block", maxWidth: 240, marginBottom: 12 }}>Extra per maand (€)<input type="number" min="0" step="0.01" value={forecastExtra} onChange={(e) => setForecastExtra(e.target.value)} style={inputStyle}/></label>{forecast.map((f) => <div key={f.id} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}><strong>{f.name}</strong>{f.months > 0 && f.payoff ? <p>Indicatief afgelost over {Math.floor(f.months / 12)} jaar en {f.months % 12} maanden. Totale toekomstige rente in dit model: {money(f.interestTotal)}.</p> : <p>{f.regular + Number(forecastExtra) <= 0 ? "Vul een maandlast of extra aflossing in voor een prognose." : "Binnen 100 jaar niet volledig afgelost met deze invoer."}</p>}</div>)}</section>
    </>}
  </main>;
}
