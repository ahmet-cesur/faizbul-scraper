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
                                <div className="bank-info">
                                    <div className="bank-logo-circle">
                                        <Landmark size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div className="bank-name">{item.bank}</div>
                                        <div className="campaign-tag">{item.desc}</div>
                                    </div>
                                </div>
                                <div className="rate-area">
                                    <span className="rate-label">Yıllık Faiz</span>
                                    <div className="rate-value">%{item.rate}</div>
                                </div>
                            </div>

                            <div className="card-body">
                                <div className="stat-item">
                                    <span className="stat-label">Brüt Faiz</span>
                                    <span className="stat-value">{formatCurrency(item.results.gross)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Stopaj (%{item.results.stopajPercent})</span>
                                    <span className="stat-value" style={{ color: '#ef4444' }}>-{formatCurrency(item.results.stopaj)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Net Kazanç</span>
                                    <span className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(item.results.net)}</span>
                                </div>
                            </div>

                            <div className="card-footer">
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {item.fullJson && (
                                        <button
                                            onClick={() => setSelectedTable(JSON.parse(item.fullJson))}
                                            className="nav-link"
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                                        >
                                            <Table size={14} /> Tüm Oranlar
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="stat-label">Vade Sonu Toplam</span>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatCurrency(item.results.total)}</div>
                                    </div>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Başvur <ChevronRight size={16} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <p style={{ color: var(--secondary) }}>Kriterlere uygun sonuç bulunamadı.</p>
          </div>
        )}
        </div >

            { selectedTable && (
                <div className="modal-overlay" onClick={() => setSelectedTable(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedTable(null)}><X /></button>
                        <h2 style={{ marginBottom: '1.5rem' }}>Banka Faiz Tablosu</h2>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Vade / Tutar</th>
                                        {selectedTable.headers.map((h, i) => (
                                            <th key={i}>{h.minAmount.toLocaleString()} TL +</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedTable.rows.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.minDays}-{row.maxDays} Gün</td>
                                            {row.rates.map((r, j) => (
                                                <td key={j}>{r ? `%${r}` : '-'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--secondary)' }}>* Veriler bilgilendirme amaçlıdır, banka şubelerinde farklılık gösterebilir.</p>
                    </div>
                </div>
            )
}
    </>
  );
}
