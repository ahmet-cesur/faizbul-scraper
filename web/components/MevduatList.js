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

        // Stopaj Rates:
        // Up to 6 months: 7.5%
        // Up to 1 year: 5%
        // Over 1 year: 2.5%
        let stopajRate = 0.075;
        if (d > 180 && d <= 365) stopajRate = 0.05;
        if (d > 365) stopajRate = 0.025;

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

    const filteredAndSortedData = useMemo(() => {
        return initialData
            .filter(item => {
                const minAmt = parseFloat(item.minAmount) || 0;
                const maxAmt = parseFloat(item.maxAmount) || 999999999;
                const minD = parseInt(item.minDays) || 0;
                const maxD = parseInt(item.maxDays) || 99999;
                return amount >= minAmt && amount <= maxAmt && days >= minD && days <= maxD;
            })
            .map(item => ({
                ...item,
                results: calculateRates(parseFloat(item.rate), amount, days)
            }))
            .sort((a, b) => b.results.net - a.results.net);
    }, [initialData, amount, days]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    };

    return (
        <>
            <section className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} color="var(--primary)" />
                        Faiz Hesaplama
                    </h2>
                    <span className="status-tag">Canlı Veri</span>
                </div>

                <div className="calculator-grid">
                    <div className="input-group">
                        <label className="input-label">Yatırılacak Tutar</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            <span className="input-suffix">TL</span>
                        </div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Vade Süresi</label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                className="input-field"
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
                        <div className="result-card fade-in" key={index}>
                            <div className="card-header">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="bank-info" style={{ cursor: 'pointer' }}>
                                    <div className="bank-logo-circle">
                                        <Landmark size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div className="bank-name">{item.bank}</div>
                                        <div className="campaign-tag">{item.desc}</div>
                                    </div>
                                </a>
                                <div className="rate-area">
                                    <span className="rate-label">Yıllık Faiz</span>
                                    <div className="rate-value">%{item.rate}</div>
                                </div>
                            </div>

                            <div className="card-body" style={{ gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                <div className="stat-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <span className="stat-label">Brüt Faiz</span>
                                    <span className="stat-value">{formatCurrency(item.results.gross)}</span>
                                </div>
                                <div className="stat-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <span className="stat-label">Stopaj (%{item.results.stopajPercent})</span>
                                    <span className="stat-value" style={{ color: '#ef4444' }}>-{formatCurrency(item.results.stopaj)}</span>
                                </div>
                                <div className="stat-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="stat-label">Net Kazanç</span>
                                    <span className="stat-value" style={{ color: '#22c55e', fontSize: '1.25rem' }}>{formatCurrency(item.results.net)}</span>
                                </div>
                            </div>

                            <div className="card-footer" style={{ background: 'var(--accent)', margin: '-1.5rem', marginTop: '0', padding: '1rem 1.5rem', borderRadius: '0 0 1.25rem 1.25rem' }}>
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
