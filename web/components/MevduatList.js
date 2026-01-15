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

    const universalParseNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        let str = val.toString().trim().replace(/\s/g, '').replace(/%/g, '').replace(/TL/gi, '');
        if (!str) return 0;

        // Count occurrences of dots and commas
        const dots = (str.match(/\./g) || []).length;
        const commas = (str.match(/,/g) || []).length;

        // Case: Constant English format with commas as thousands (e.g., 100,000.00)
        // or Turkish format with dots as thousands (e.g., 100.000,00)
        if (dots > 0 && commas > 0) {
            const lastDot = str.lastIndexOf('.');
            const lastComma = str.lastIndexOf(',');
            if (lastDot > lastComma) {
                // English: 1,234.56
                return parseFloat(str.replace(/,/g, '')) || 0;
            } else {
                // Turkish: 1.234,56
                return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
            }
        }

        // Case: Only one type of separator
        if (commas > 0 && dots === 0) {
            // Check if it's a decimal comma (Turkish 45,50) or thousand comma (English 100,000)
            const parts = str.split(',');
            if (parts[parts.length - 1].length === 2 || parts[parts.length - 1].length === 1) {
                return parseFloat(str.replace(',', '.')) || 0;
            }
            return parseFloat(str.replace(/,/g, '')) || 0;
        }

        if (dots > 0 && commas === 0) {
            // Check if it's a decimal dot (English 45.50) or thousand dot (Turkish 100.000)
            const parts = str.split('.');
            if (parts[parts.length - 1].length === 3) {
                return parseFloat(str.replace(/\./g, '')) || 0;
            }
            return parseFloat(str) || 0;
        }

        return parseFloat(str) || 0;
    };

    const filteredAndSortedData = useMemo(() => {
        if (!initialData) return [];

        const results = initialData
            .map(item => {
                const rate = universalParseNumber(item.rate);
                const minAmt = universalParseNumber(item.minAmount);
                const maxAmt = universalParseNumber(item.maxAmount) || 999999999999;
                const minD = parseInt(item.minDays) || 0;
                const maxD = parseInt(item.maxDays) || 99999;

                // Check if current search matches this row's bounds
                const matches = amount >= minAmt && amount <= maxAmt && days >= minD && days <= maxD;

                return {
                    ...item,
                    parsedRate: rate,
                    matches,
                    results: calculateRates(rate, amount, days)
                };
            })
            .filter(item => item.matches)
            .sort((a, b) => b.results.net - a.results.net);

        // Deduplication: Only show unique bank+description combinations or best rate per bank
        // To increase visible banks, we'll favor showing more, but keep it one per bank per offer type
        const seen = new Set();
        const finalResults = [];

        for (const item of results) {
            const key = `${item.bank.toLowerCase().trim()}|${item.parsedRate}`;
            if (!seen.has(key)) {
                seen.add(key);
                finalResults.push(item);
            }
        }

        return finalResults;
    }, [initialData, amount, days]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <>
            <section className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
                <div className="calculator-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr',
                    gap: '1rem',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={16} color="var(--primary)" />
                        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Hesapla</h2>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <div className="input-wrapper" style={{ height: '36px' }}>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0 0.75rem', fontSize: '0.9rem' }}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <span className="input-suffix" style={{ fontSize: '0.8rem' }}>TL</span>
                        </div>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <div className="input-wrapper" style={{ height: '36px' }}>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0 0.75rem', fontSize: '0.9rem' }}
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                            />
                            <span className="input-suffix" style={{ fontSize: '0.8rem' }}>GÜN</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="results-list" style={{ gap: '0.5rem' }}>
                {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map((item, index) => (
                        <div className="result-card fade-in" key={index} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                            <div className="result-row-grid">
                                {/* Bank Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    <div className="bank-logo-circle" style={{ width: '28px', height: '28px', minWidth: '28px', background: 'var(--accent)' }}>
                                        <Landmark size={14} color="var(--primary)" />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="bank-name" style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.bank}</div>
                                        {item.desc && <div style={{ fontSize: '0.6rem', color: 'var(--secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.desc}</div>}
                                    </div>
                                </div>

                                {/* Rate */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>%{item.rate}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>Yıllık Faiz</div>
                                </div>

                                {/* Net */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#22c55e' }}>{formatCurrency(item.results.net)}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                                        <span style={{ fontWeight: 700 }}>Net Kazanç</span>
                                        <span style={{ fontSize: '0.55rem', opacity: 0.8, textTransform: 'none', color: 'var(--secondary)' }}>
                                            Stopaj: {formatCurrency(item.results.stopaj)} (%{item.results.stopajPercent})
                                        </span>
                                    </div>
                                </div>

                                {/* Vade Sonu (Toplam) */}
                                <div style={{ textAlign: 'center' }} className="hide-mobile">
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatCurrency(item.results.total)}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>Toplam</div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    {item.fullJson && (
                                        <button
                                            onClick={() => setSelectedTable(JSON.parse(item.fullJson))}
                                            style={{ padding: '0.4rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Table size={14} color="var(--foreground)" />
                                        </button>
                                    )}
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ padding: '0.4rem 0.8rem', background: 'var(--primary)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                        Başvur <ChevronRight size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>Kriterlere uygun sonuç bulunamadı.</p>
                    </div>
                )}
            </div>

            {selectedTable && (
                <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }}>
                        <button className="close-btn" onClick={() => setSelectedTable(null)} style={{ color: '#64748b' }}><X /></button>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedTable.bankName || 'Faiz Tablosu'}</h2>
                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Tutar: {new Intl.NumberFormat('tr-TR').format(amount)} TL • {days} Gün
                            </p>
                        </div>

                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: '#020617', color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left', padding: '0.75rem 1rem', minWidth: '100px' }}>Vade</th>
                                        {selectedTable.headers.map((h, i) => (
                                            <th key={i} style={{ background: '#020617', color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'center', padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                                {h.label || h.minAmount.toLocaleString() + ' TL +'}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedTable.rows.map((row, i) => {
                                        const isDayMatch = days >= row.minDays && days <= row.maxDays;
                                        return (
                                            <tr key={i} style={{ background: isDayMatch ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                                                <td style={{
                                                    fontWeight: 600,
                                                    padding: '0.75rem 1rem',
                                                    borderBottom: '1px solid #1e293b',
                                                    color: isDayMatch ? 'var(--primary)' : '#94a3b8',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {row.label || `${row.minDays}-${row.maxDays} Gün`}
                                                </td>
                                                {row.rates.map((r, j) => {
                                                    const h = selectedTable.headers[j];
                                                    const min = parseTurkishNumber(h.minAmount);
                                                    const max = parseTurkishNumber(h.maxAmount) || 999999999;
                                                    const isAmountMatch = amount >= min && amount <= max;
                                                    const isCellActive = isDayMatch && isAmountMatch;

                                                    return (
                                                        <td key={j} style={{
                                                            textAlign: 'center',
                                                            padding: '0.75rem',
                                                            borderBottom: '1px solid #1e293b',
                                                            fontWeight: isCellActive ? 800 : 500,
                                                            color: isCellActive ? '#fff' : '#475569',
                                                            background: isCellActive ? 'var(--primary)' : 'transparent',
                                                            borderRadius: isCellActive ? '6px' : '0'
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
                    </div>
                </div>
            )}
        </>
    );
}
