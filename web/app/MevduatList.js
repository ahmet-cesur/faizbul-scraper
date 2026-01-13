'use client';

import { useState, useMemo } from 'react';
import { Landmark, TrendingUp } from 'lucide-react';

export default function MevduatList({ initialData }) {
    const [amount, setAmount] = useState(100000);
    const [days, setDays] = useState(32);

    const calculateNetProfit = (rate, amt, d) => {
        // Basic Turkish Deposit Tax (Stopaj) calculation
        // Up to 6 months: 7.5% (was changed recently, using 7.5% as standard example)
        const stopajRate = 0.075;
        const grossProfit = (amt * rate * d) / 36500;
        const netProfit = grossProfit * (1 - stopajRate);
        return netProfit;
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
                netProfit: calculateNetProfit(parseFloat(item.rate), amount, days)
            }))
            .sort((a, b) => b.netProfit - a.netProfit);
    }, [initialData, amount, days]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    };

    return (
        <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} color="var(--primary)" />
                    Faiz Hesaplama ve Karşılaştırma
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
                            placeholder="Örn: 100.000"
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
                            placeholder="Örn: 32"
                        />
                        <span className="input-suffix">GÜN</span>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Banka</th>
                            <th>Vade Aralığı</th>
                            <th>Faiz Oranı</th>
                            <th>Net Getiri</th>
                            <th>Toplam Tutar</th>
                            <th>Detay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedData.length > 0 ? (
                            filteredAndSortedData.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="bank-cell">
                                            <div className="bank-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                                                <Landmark size={18} color="#64748b" />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{item.bank}</span>
                                        </div>
                                    </td>
                                    <td><span style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>{item.minDays}-{item.maxDays} Gün</span></td>
                                    <td>
                                        <div className="rate-badge">%{item.rate}</div>
                                    </td>
                                    <td>
                                        <div className="net-profit">{formatCurrency(item.netProfit)}</div>
                                        <span className="profit-label">Net Kazanç</span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{formatCurrency(amount + item.netProfit)}</div>
                                    </td>
                                    <td>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>İncele</a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)' }}>
                                    Girdiğiniz kriterlere uygun sonuç bulunamadı. Lütfen tutar veya vadeyi değiştirmeyi deneyin.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
