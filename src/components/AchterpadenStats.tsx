import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

type Registratie = any;

const COLORS = ['#4F46E5', '#06B6D4', '#F97316', '#10B981', '#EF4444', '#6366F1', '#F59E0B'];

function aggregateBy<T>(items: T[], keyFn: (it: T) => string | undefined) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it) || 'Onbekend';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function lastNmonths(n = 12) {
  const res: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    res.push(m.toLocaleString(undefined, { month: 'short', year: 'numeric' }));
  }
  return res;
}

export default function AchterpadenStats({ registraties }: { registraties: Registratie[] }) {
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [selectedWijk, setSelectedWijk] = useState<string>('alle');
  const [view, setView] = useState<'totaal' | 'perWijk' | 'perRegistratie'>('totaal');
  const { theme } = useAppContext();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!reportHtml || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(reportHtml);
    doc.close();
  }, [reportHtml]);

  const wijken = useMemo(() => {
    const set = new Set<string>();
    registraties.forEach((r: any) => { if (r.wijk) set.add(r.wijk); });
    return Array.from(set.values()).sort();
  }, [registraties]);

  const filtered = useMemo(() => selectedWijk === 'alle' ? registraties : registraties.filter((r: any) => r.wijk === selectedWijk), [registraties, selectedWijk]);

  const byWijk = useMemo(() => aggregateBy(registraties, (r: any) => r.wijk), [registraties]);
  const byType = useMemo(() => aggregateBy(filtered, (r: any) => r.typePad || r.type), [filtered]);
  
  // Nieuwe data: veiligheid + urgentie statistieken
  const byVeiligheid = useMemo(() => {
    const map = new Map<string, number>();
    map.set('⭐ Zeer onveilig', 0);
    map.set('⭐⭐ Onveilig', 0);
    map.set('⭐⭐⭐ Matig', 0);
    map.set('⭐⭐⭐⭐ Veilig', 0);
    map.set('⭐⭐⭐⭐⭐ Zeer veilig', 0);
    
    for (const r of filtered) {
      if (!r.veiligheid) continue;
      const score = r.veiligheid.score || 3;
      if (score === 1) map.set('⭐ Zeer onveilig', (map.get('⭐ Zeer onveilig') || 0) + 1);
      else if (score === 2) map.set('⭐⭐ Onveilig', (map.get('⭐⭐ Onveilig') || 0) + 1);
      else if (score === 3) map.set('⭐⭐⭐ Matig', (map.get('⭐⭐⭐ Matig') || 0) + 1);
      else if (score === 4) map.set('⭐⭐⭐⭐ Veilig', (map.get('⭐⭐⭐⭐ Veilig') || 0) + 1);
      else if (score === 5) map.set('⭐⭐⭐⭐⭐ Zeer veilig', (map.get('⭐⭐⭐⭐⭐ Zeer veilig') || 0) + 1);
    }
    
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  
  const byUrgentie = useMemo(() => {
    const map = new Map<string, number>();
    map.set('🔴 Spoed', 0);
    map.set('🟠 Hoog', 0);
    map.set('🟡 Normaal', 0);
    map.set('🟢 Laag', 0);
    map.set('⚪ Geen', 0);
    
    for (const r of filtered) {
      if (!r.onderhoud) continue;
      const urg = r.onderhoud.urgentie;
      if (urg === 'spoed') map.set('🔴 Spoed', (map.get('🔴 Spoed') || 0) + 1);
      else if (urg === 'hoog') map.set('🟠 Hoog', (map.get('🟠 Hoog') || 0) + 1);
      else if (urg === 'normaal') map.set('🟡 Normaal', (map.get('🟡 Normaal') || 0) + 1);
      else if (urg === 'laag') map.set('🟢 Laag', (map.get('🟢 Laag') || 0) + 1);
      else map.set('⚪ Geen', (map.get('⚪ Geen') || 0) + 1);
    }
    
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  
  const byMedewerker = useMemo(() => {
    return aggregateBy(filtered, (r: any) => r.registeredBy?.userName || r.registeredBy?.userRole || 'Onbekend');
  }, [filtered]);

  const months = useMemo(() => lastNmonths(12), []);
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of months) map.set(m, 0);
    for (const r of filtered) {
      const ts = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : (r.createdAt ? new Date(r.createdAt) : null);
      if (!ts) continue;
      const label = ts.toLocaleString(undefined, { month: 'short', year: 'numeric' });
      if (!map.has(label)) continue;
      map.set(label, (map.get(label) || 0) + 1);
    }
    return months.map(m => ({ month: m, count: map.get(m) || 0 }));
  }, [filtered, months]);

  const total = filtered.length;

  const generateAiSummary = () => {
    const topWijk = (selectedWijk === 'alle' ? byWijk : aggregateBy(filtered, (r: any) => r.wijk)).slice().sort((a, b) => b.value - a.value)[0];
    const topType = byType.slice().sort((a, b) => b.value - a.value)[0];
    const trend = monthly.slice(-3).map(m => m.count);
    const trendText = trend.every((v, i, a) => i === 0 || v >= a[i - 1]) ? 'stijgende' : (trend.every((v, i, a) => i === 0 || v <= a[i - 1]) ? 'dalende' : 'wisselende');
    
    // Nieuwe data insights
    const topMedewerker = byMedewerker.slice().sort((a, b) => b.value - a.value)[0];
    const onveiligCount = byVeiligheid.slice(0, 2).reduce((sum, item) => sum + item.value, 0); // ⭐ + ⭐⭐
    const spoedCount = byUrgentie[0].value; // 🔴 Spoed
    const hoogCount = byUrgentie[1].value; // 🟠 Hoog
    const criticalCount = spoedCount + hoogCount;

    const scopeText = selectedWijk === 'alle' ? 'Alle wijken' : `Wijk: ${selectedWijk}`;
    const summary = `Achterpaden rapport\nScope: ${scopeText}\nTotaal registraties: ${total}\n\nVEILIGHEID & URGENTIE:\n- Onveilige achterpaden (⭐⭐ of minder): ${onveiligCount} (${Math.round(onveiligCount/total*100)}%)\n- Kritische urgentie (spoed/hoog): ${criticalCount} (${Math.round(criticalCount/total*100)}%)\n\nTOP STATISTIEKEN:\n- Meest geregistreerde wijk: ${topWijk ? `${topWijk.name} (${topWijk.value})` : 'geen data'}\n- Meest actieve medewerker: ${topMedewerker ? `${topMedewerker.name} (${topMedewerker.value} registraties)` : 'geen data'}\n- Type pad: ${topType ? `${topType.name} (${topType.value})` : 'geen data'}\n\nTREND:\nRecente trend (laatste 3 periodes): ${trend.join(' / ')} — algemeen ${trendText} patroon.\n\nAANBEVELINGEN:\n${onveiligCount > 0 ? `- PRIORITEIT: ${onveiligCount} onveilige achterpaden vereisen directe aandacht voor verlichting en zichtbaarheid.\n` : ''}${criticalCount > 0 ? `- ${criticalCount} achterpaden met spoed/hoog urgentie onderhoud nodig.\n` : ''}- Focus op wijken met meeste meldingen voor preventief onderhoud.\n- Bekijk de bijbehorende updates per registratie voor details.\n`;

    const lightStyles = `
      :root { --accent: #2563EB; --text: #0f172a; --muted: #475569; }
      body { font-family: Inter, system-ui, -apple-system, sans-serif; padding: 28px; color: var(--text); background: #ffffff }
      .header { display:flex; align-items:center; gap:16px; margin-bottom:18px }
      .logo { height:58px }
      h1 { color: var(--text); font-size:28px; margin:0 }
      h2 { font-size:18px; margin:0 0 8px 0; color: var(--accent) }
      .section { margin-bottom: 20px }
      .chart { width: 100%; height: 340px; }
      .meta { font-size: 13px; color: var(--muted); margin-bottom:6px }
      .summary { white-space: pre-wrap; background: #fbfdff; padding: 14px; border-radius: 10px; color: var(--text); font-size:15px }
      strong { color: var(--accent) }
    `;
    const darkStyles = `
      :root { --accent: #60a5fa; --text: #e6eefc; --muted: #9aa7bf }
      body { font-family: Inter, system-ui, -apple-system, sans-serif; padding: 28px; color: var(--text); background: #071025 }
      .header { display:flex; align-items:center; gap:16px; margin-bottom:18px }
      .logo { height:58px; filter: drop-shadow(0 1px 0 rgba(0,0,0,0.3)); }
      h1 { color: var(--text); font-size:28px; margin:0 }
      h2 { font-size:18px; margin:0 0 8px 0; color: var(--accent) }
      .section { margin-bottom: 20px }
      .chart { width: 100%; height: 340px; }
      .meta { font-size: 13px; color: var(--muted); margin-bottom:6px }
      .summary { white-space: pre-wrap; background: #021022; padding: 14px; border-radius: 10px; color: var(--text); font-size:15px }
      strong { color: var(--accent) }
    `;

    const styles = (theme === 'dark' ? darkStyles : lightStyles);

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Achterpaden Rapport</title>
        <style>
          ${styles}
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo_buurtteam_01.png" alt="BuurtTeam" class="logo" onerror="this.style.display='none'" />
          <div>
            <h1>Achterpaden — Automatisch Verslag</h1>
            <div class="meta">Gegenereerd: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="section">
          <h2>Samenvatting</h2>
          <div class="summary">${summary}</div>
        </div>
        <div class="section">
          <h2>Statistieken</h2>
          <div>Totale registraties: <strong>${total}</strong></div>
        </div>
        <div class="section">
          <h2>Visuele weergave</h2>
          <p>Open de webversie voor interactieve charts (PDF bevat statische afbeeldingen).</p>
        </div>
      </body>
      </html>
    `;
    setReportHtml(html);
    return summary;
  };

  const downloadReport = () => {
    if (!reportHtml) return;
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) {
      alert('Popup geblokkeerd — sta popups toe of open het rapport in een nieuw venster.');
      return;
    }
    w.document.write(reportHtml);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* no-op */ } }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Wijk</label>
          <select value={selectedWijk} onChange={(e) => setSelectedWijk(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-dark-bg border-gray-300 dark:border-dark-border">
            <option value="alle">Alle wijken</option>
            {wijken.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Weergave</label>
          <div className="flex gap-2">
            <button type="button" className={`px-3 py-1 rounded ${view==='totaal'?'bg-brand-primary text-white':'bg-gray-100 dark:bg-dark-border'}`} onClick={() => setView('totaal')}>Totaaloverzicht</button>
            <button type="button" className={`px-3 py-1 rounded ${view==='perWijk'?'bg-brand-primary text-white':'bg-gray-100 dark:bg-dark-border'}`} onClick={() => setView('perWijk')}>Per wijk</button>
            <button type="button" className={`px-3 py-1 rounded ${view==='perRegistratie'?'bg-brand-primary text-white':'bg-gray-100 dark:bg-dark-border'}`} onClick={() => setView('perRegistratie')}>Per registratie</button>
          </div>
        </div>
        <div className="ml-auto text-sm text-gray-600 dark:text-dark-text-secondary">Resultaten: <span className="font-semibold">{total}</span></div>
      </div>

      {view === 'perRegistratie' ? (
        <div className="bg-white dark:bg-dark-surface rounded shadow overflow-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Datum</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Wijk</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Straat</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Veiligheid</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Urgentie</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Lengte</th>
                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Medewerker</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const ts = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : (r.createdAt ? new Date(r.createdAt) : null);
                const veiligheidScore = r.veiligheid?.score || null;
                const urgentie = r.onderhoud?.urgentie || null;
                const medewerker = r.registeredBy?.userName || r.registeredBy?.userRole || '-';
                
                return (
                  <tr key={r.id || `${r.straat}-${r.wijk}-${r.createdAt}`} className="border-b border-gray-100 dark:border-dark-border last:border-0">
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{ts ? ts.toLocaleDateString() : ''}</td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{r.wijk || '-'}</td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{r.straat || '-'}</td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">
                      {veiligheidScore ? '⭐'.repeat(veiligheidScore) : (r.staat || '-')}
                    </td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">
                      {urgentie ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          urgentie === 'spoed' ? 'bg-red-100 text-red-800' :
                          urgentie === 'hoog' ? 'bg-orange-100 text-orange-800' :
                          urgentie === 'normaal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {urgentie === 'spoed' ? '🔴' : urgentie === 'hoog' ? '🟠' : urgentie === 'normaal' ? '🟡' : '🟢'} {urgentie}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{r.lengte ? `${Math.round(r.lengte)}m` : '-'}</td>
                    <td className="p-3 text-gray-800 dark:text-dark-text-primary text-sm">{medewerker}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Nieuwe KPI cards met veiligheid + urgentie metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">Totaal registraties</h3>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow border-l-4 border-red-500">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">🔴 Kritisch (spoed/hoog)</h3>
              <div className="text-2xl font-bold text-red-600">
                {byUrgentie[0].value + byUrgentie[1].value}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((byUrgentie[0].value + byUrgentie[1].value) / total * 100)}% van totaal
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow border-l-4 border-orange-500">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">⭐⭐ Onveilig</h3>
              <div className="text-2xl font-bold text-orange-600">
                {byVeiligheid[0].value + byVeiligheid[1].value}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((byVeiligheid[0].value + byVeiligheid[1].value) / total * 100)}% van totaal
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h3 className="text-sm text-gray-500 dark:text-gray-400">👤 Actieve medewerkers</h3>
              <div className="text-2xl font-bold">{byMedewerker.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Veiligheid distributie */}
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>🛡️</span>
                <span>Veiligheid score</span>
              </h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byVeiligheid} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                      {byVeiligheid.map((_entry, idx) => (
                        <Cell 
                          key={`cell-veiligheid-${idx}`} 
                          fill={idx === 0 ? '#EF4444' : idx === 1 ? '#F97316' : idx === 2 ? '#EAB308' : idx === 3 ? '#10B981' : '#059669'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Urgentie distributie */}
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>Onderhoud urgentie</span>
              </h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byUrgentie}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06B6D4">
                      {byUrgentie.map((_entry, idx) => (
                        <Cell 
                          key={`cell-urgentie-${idx}`} 
                          fill={idx === 0 ? '#EF4444' : idx === 1 ? '#F97316' : idx === 2 ? '#EAB308' : idx === 3 ? '#10B981' : '#6B7280'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Medewerker activiteit */}
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>👤</span>
                <span>Per medewerker</span>
              </h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byMedewerker.slice(0, 8).sort((a, b) => b.value - a.value)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Tweede rij met wijk + trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h4 className="font-medium mb-2">📍 Verdeling per wijk</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byWijk} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                      {byWijk.map((entry, idx) => <Cell key={`cell-${idx}-${entry.name}`} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
              <h4 className="font-medium mb-2">📈 Trend (laatste 12 maanden)</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 items-center">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => { generateAiSummary(); }}>Genereer verslag (AI)</button>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={() => downloadReport()} disabled={!reportHtml}>Download PDF</button>
      </div>

      {reportHtml && (
        <div className="p-4 bg-white dark:bg-dark-surface rounded shadow">
          <h4 className="font-medium mb-2">Voorbeeld samenvatting</h4>
          <div className="border rounded overflow-hidden">
            <iframe title="rapport-preview" ref={iframeRef} className="w-full h-[420px] bg-white" />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tip: plaats je logo in <code>/public/logo_buurtteam_01.png</code> voor weergave in het rapport (iframe verbergt het als het niet beschikbaar is).</div>
        </div>
      )}
    </div>
  );
}
