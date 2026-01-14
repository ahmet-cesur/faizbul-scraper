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
        let str = val.toString().trim().replace(/\s/g, '');
        if (!str) return 0;

        if (str.includes(',')) {
            // Turkish format: dots are thousands, comma is decimal
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        }

        // If there's no comma, check if the dot is a thousands separator
        // Heuristic: If there's a dot and it's followed by exactly 3 digits (e.g., 100.000)
        // AND it's not a common rate format (rates are usually one or two decimals)
        const parts = str.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (lastPart.length === 3) {
                // Highly likely a thousands separator (e.g. 100.000, 1.000)
                return parseFloat(str.replace(/\./g, '')) || 0;
            }
        }

        return parseFloat(str) || 0;
    };

    const filteredAndSortedData = useMemo(() => {
        const results = initialData
            .filter(item => {
                const minAmt = parseTurkishNumber(item.minAmount);
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
            const normName = item.bank.toLowerCase().trim();
            if (!seenBanks.has(normName)) {
                seenBanks.add(normName);
                uniqueBanks.push(item);
            }
        }

        return uniqueBanks;
    }, [initialData, amount, days]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <>
            <section className="card" style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <TrendingUp size={18} color="var(--primary)" />
                        Faiz Hesaplama
                    </h2>
                    <span className="status-tag" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>Canlı Veri</span>
                </div>

                <div className="calculator-grid" style={{ gap: '0.75rem' }}>
                    <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Yatırılacak Tutar</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <span className="input-suffix" style={{ fontSize: '0.8rem' }}>TL</span>
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Vade Süresi</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                            />
                            <span className="input-suffix" style={{ fontSize: '0.8rem' }}>GÜN</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="results-list" style={{ gap: '0.75rem' }}>
                {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map((item, index) => (
                        <div className="result-card fade-in" key={index} style={{ padding: '0.75rem 1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                            <div className="card-header" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="bank-logo-circle" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                                        <Landmark size={18} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div className="bank-name" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{item.bank}</div>
                                        {item.desc && <div className="campaign-tag" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', marginTop: '1px' }}>{item.desc}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        {formatCurrency(item.results.net)}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', marginTop: '-2px' }}>Net Kazanç</div>
                                </div>
                            </div>

                            <div className="card-body" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem 0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '0.5rem',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--secondary)' }}>Yıllık Faiz</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>%{item.rate}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--secondary)' }}>Brüt Faiz</span>
                                        <span style={{ fontSize: '0.85rem' }}>{formatCurrency(item.results.gross)}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--secondary)' }}>Vade Sonu</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(item.results.total)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {item.fullJson && (
                                        <button
                                            onClick={() => setSelectedTable(JSON.parse(item.fullJson))}
                                            style={{
                                                padding: '0.4rem 0.6rem',
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--foreground)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            <Table size={14} />
                                        </button>
                                    )}
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '0.4rem 1rem',
                                            background: 'var(--primary)',
                                            color: '#fff',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem'
                                        }}
                                    >
                                        Başvur <ChevronRight size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Kriterlere uygun sonuç bulunamadı.</p>
                    </div>
                )}
            </div >

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
                                        <th style={{ background: '#020617', color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left', padding: '0.75rem' }}>Vade</th>
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
                                                    padding: '0.75rem',
                                                    borderBottom: '1px solid #1e293b',
                                                    color: isDayMatch ? 'var(--primary)' : '#94a3b8'
                                                }}>
                                                    {row.label || `${row.minDays}-${row.maxDays} Gün`}
                                                </td>
                                                {row.rates.map((r, j) => {
                                                    const h = selectedTable.headers[j];
                                                    const min = parseFloat(h.minAmount) || 0;
                                                    const max = parseFloat(h.maxAmount) || 999999999;
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
