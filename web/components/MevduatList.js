'use client';

import { useState, useMemo } from 'react';
import { Landmark, TrendingUp, ChevronRight, Table, X } from 'lucide-react';

export default function MevduatList({ initialData }) {
    const [amount, setAmount] = useState(100000);
    const [days, setDays] = useState(32);
    const [selectedTable, setSelectedTable] = useState(null);

    const calculateRates = (rate, amt, d) => {
        // Basic Turkish Deposit calculation
        const grossProfit = (amt * rate * d) / 36500;

        // Stopaj Rates (Updated to match Android logic):
        // Up to 182 days (approx 6 months): 17.5%
        // Up to 365 days (1 year): 15%
        // Over 1 year: 10%
        let stopajRate = 0.10;
        if (d <= 182) stopajRate = 0.175;
        else if (d <= 365) stopajRate = 0.15;

        const stopajAmount = grossProfit * stopajRate;
        const netProfit = grossProfit - stopajAmount;

        return {
            gross: grossProfit,
            stopaj: stopajAmount,
            net: netProfit,
            total: amt + netProfit,
            stopajPercent: (stopajRate * 100).toFixed(1)
        };
    };

    const parseTurkishNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = val.toString();
        // Only apply Turkish conversion if a decimal comma is present
        // This avoids incorrectly stripping dots from standard decimal numbers (e.g., "39.5" -> "395")
        if (str.includes(',')) {
            let clean = str.replace(/\./g, '').replace(',', '.');
            return parseFloat(clean) || 0;
        }
        return parseFloat(str) || 0;
    };

    const filteredAndSortedData = useMemo(() => {
        const results = initialData
            .filter(item => {
                const minAmt = parseTurkishNumber(item.minAmount);
                // If maxAmount is effectively infinite or default string, ensure it's handled
                const rawMax = parseTurkishNumber(item.maxAmount);
                const maxAmt = rawMax === 0 ? 999999999 : rawMax;

                const minD = parseInt(item.minDays) || 0;
                const maxD = parseInt(item.maxDays) || 99999;

                return amount >= minAmt && amount <= maxAmt && days >= minD && days <= maxD;
            })
            .map(item => ({
                ...item,
                results: calculateRates(parseTurkishNumber(item.rate), amount, days)
            }))
            .sort((a, b) => b.results.net - a.results.net);

        // Deduplicate: Keep only the best offer per bank
        const uniqueBanks = [];
        const seenBanks = new Set();

        for (const item of results) {
            // Normalize bank name to handle slight variations
            const normName = item.bank.toLowerCase().trim();
            if (!seenBanks.has(normName)) {
                seenBanks.add(normName);
                uniqueBanks.push(item);
            }
        }

        return uniqueBanks;
    }, [initialData, amount, days]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    };

    return (
        <>
            <section className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} color="var(--primary)" />
                        Faiz Hesaplama
                    </h2>
                    <span className="status-tag">Canlı Veri</span>
                </div>

                <div className="calculator-grid">
                    <div className="input-group">
                        <label className="input-label" style={{ marginBottom: '0.25rem' }}>Yatırılacak Tutar</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem 1rem' }}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <span className="input-suffix">TL</span>
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label" style={{ marginBottom: '0.25rem' }}>Vade Süresi</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem 1rem' }}
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                            />
                            <span className="input-suffix">GÜN</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="results-list">
                {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map((item, index) => (
                        <div className="result-card fade-in" key={index} style={{ padding: '1rem', borderRadius: '1rem' }}>
                            <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="bank-info" style={{ cursor: 'pointer' }}>
                                    <div className="bank-logo-circle" style={{ width: '40px', height: '40px' }}>
                                        <Landmark size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div className="bank-name" style={{ fontSize: '1rem' }}>{item.bank}</div>
                                        <div className="campaign-tag" style={{ fontSize: '0.7rem' }}>{item.desc}</div>
                                    </div>
                                </a>
                                <div className="rate-area">
                                    <span className="rate-label" style={{ fontSize: '0.65rem' }}>Yıllık Faiz</span>
                                    <div className="rate-value" style={{ fontSize: '1.25rem' }}>%{item.rate}</div>
                                </div>
                            </div>

                            <div className="card-body" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'flex-start', border: 'none', padding: 0 }}>
                                    <span className="stat-label">Brüt Faiz</span>
                                    <span className="stat-value" style={{ fontSize: '0.9rem' }}>{formatCurrency(item.results.gross)}</span>
                                </div>
                                <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'flex-start', border: 'none', padding: 0 }}>
                                    <span className="stat-label">Stopaj (%{item.results.stopajPercent})</span>
                                    <span className="stat-value" style={{ color: '#ef4444', fontSize: '0.9rem' }}>-{formatCurrency(item.results.stopaj)}</span>
                                </div>
                                <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'flex-start', border: 'none', padding: 0 }}>
                                    <span className="stat-label">Net Kazanç</span>
                                    <span className="stat-value" style={{ color: '#22c55e', fontSize: '1.1rem' }}>{formatCurrency(item.results.net)}</span>
                                </div>
                            </div>

                            <div className="card-footer" style={{ background: 'var(--accent)', margin: '-1rem', marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0 0 1rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <span className="stat-label">Vade Sonu Toplam</span>
                                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{formatCurrency(item.results.total)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        {item.fullJson && (
                                            <button
                                                onClick={() => setSelectedTable(JSON.parse(item.fullJson))}
                                                className="btn-secondary"
                                                style={{ padding: '0.6rem 1rem', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '8px' }}
                                            >
                                                <Table size={16} /> Tablo
                                            </button>
                                        )}
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}>
                                            Başvur <ChevronRight size={16} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <p style={{ color: 'var(--secondary)' }}>Kriterlere uygun sonuç bulunamadı.</p>
                    </div>
                )}
            </div >

            {selectedTable && (
                <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
                        <button className="close-btn" onClick={() => setSelectedTable(null)} style={{ color: '#94a3b8' }}><X /></button>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedTable.bankName || 'Faiz Tablosu'}</h2>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                Tutar: {new Intl.NumberFormat('tr-TR').format(amount)} TL • {days} Gün
                            </p>
                        </div>

                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left', padding: '1rem' }}>Vade</th>
                                        {selectedTable.headers.map((h, i) => (
                                            <th key={i} style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'center', padding: '1rem', whiteSpace: 'nowrap' }}>
                                                {h.label || h.minAmount.toLocaleString() + ' TL +'}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedTable.rows.map((row, i) => {
                                        const isDayMatch = days >= row.minDays && days <= row.maxDays;
                                        return (
                                            <tr key={i} style={{ background: isDayMatch ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                                                <td style={{
                                                    fontWeight: 600,
                                                    padding: '1rem',
                                                    borderBottom: '1px solid #334155',
                                                    color: isDayMatch ? '#34d399' : '#e2e8f0'
                                                }}>
                                                    {row.label || `${row.minDays}-${row.maxDays} Gün`}
                                                </td>
                                                {row.rates.map((r, j) => {
                                                    // Check if this column matches the amount
                                                    const h = selectedTable.headers[j];
                                                    const min = parseFloat(h.minAmount) || 0;
                                                    const max = parseFloat(h.maxAmount) || 999999999;
                                                    const isAmountMatch = amount >= min && amount <= max;
                                                    const isCellActive = isDayMatch && isAmountMatch;

                                                    return (
                                                        <td key={j} style={{
                                                            textAlign: 'center',
                                                            padding: '1rem',
                                                            borderBottom: '1px solid #334155',
                                                            fontWeight: isCellActive ? 800 : 500,
                                                            color: isCellActive ? '#fff' : '#cbd5e1',
                                                            background: isCellActive ? '#10b981' : 'transparent',
                                                            borderRadius: isCellActive ? '8px' : '0'
                                                        }}>
                                                            {r ? `%${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(r)}` : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                            * Bu veriler bilgilendirme amaçlıdır. Nihai faiz oranı banka tarafından belirlenir.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
