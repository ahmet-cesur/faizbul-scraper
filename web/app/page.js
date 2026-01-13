import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Landmark, Car, CreditCard, TrendingUp, ShieldCheck } from 'lucide-react';

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function getSheetData() {
    try {
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!serviceAccountEmail || !privateKey) {
            console.warn('Missing Google Credentials, using mock data for development');
            return getMockData();
        }

        const auth = new JWT({
            email: serviceAccountEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        // Map rows to a cleaner format
        // columns: Date, Bank, Desc, Rate, MinAmount, MaxAmount, MinDays, MaxDays, URL, JSON
        return rows.map(row => ({
            bank: row.get('Bank'),
            desc: row.get('Desc'),
            rate: row.get('Rate'),
            minAmount: row.get('MinAmount'),
            maxAmount: row.get('MaxAmount'),
            minDays: row.get('MinDays'),
            maxDays: row.get('MaxDays'),
            url: row.get('URL'),
        })).filter(item => item.bank && item.rate);
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return getMockData();
    }
}

function getMockData() {
    return [
        { bank: 'Akbank', desc: 'Tanışma Faizi', rate: '54.00', minAmount: '1000', maxAmount: '500000', minDays: '32', maxDays: '92', url: '#' },
        { bank: 'Garanti BBVA', desc: 'E-Vadeli', rate: '52.50', minAmount: '5000', maxAmount: '1000000', minDays: '32', maxDays: '365', url: '#' },
        { bank: 'Ziraat Bankası', desc: 'Vadeli Mevduat', rate: '48.00', minAmount: '1000', maxAmount: '10000000', minDays: '32', maxDays: '365', url: '#' },
    ];
}

export default async function Home() {
    const data = await getSheetData();

    return (
        <div className="animate-fade-in">
            <header>
                <div className="container">
                    <nav>
                        <div className="logo">kiyas.tr</div>
                        <div className="nav-links">
                            <a href="#" className="nav-link active">Mevduat</a>
                            <a href="#" className="nav-link">Araç</a>
                            <a href="#" className="nav-link">Kredi</a>
                        </div>
                        <a href="https://play.google.com/store/apps/details?id=com.acesur.faizbul" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Uygulamayı İndir</a>
                    </nav>
                </div>
            </header>

            <main className="container">
                <section className="hero">
                    <h1>Paranızın Değerini <span style={{ color: 'var(--primary)' }}>Kıyaslayın</span></h1>
                    <p>Türkiye'deki tüm bankaların güncel mevduat faiz oranlarını anlık olarak karşılaştırın, en yüksek getiriyi bulun.</p>
                </section>

                <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} color="var(--primary)" />
                            En Yüksek Mevduat Faizleri
                        </h2>
                        <span className="status-tag">Canlı Veri</span>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Banka</th>
                                    <th>Kampanya / Hesap Türü</th>
                                    <th>Vade (Gün)</th>
                                    <th>Faiz Oranı</th>
                                    <th>Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <div className="bank-cell">
                                                <div className="bank-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                                                    <Landmark size={18} color="#64748b" />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{item.bank}</span>
                                            </div>
                                        </td>
                                        <td><span style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>{item.desc}</span></td>
                                        <td>{item.minDays}-{item.maxDays} Gün</td>
                                        <td>
                                            <div className="rate-badge">%{item.rate}</div>
                                        </td>
                                        <td>
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Hesapla</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <Car size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3>Araç Fiyatları</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Sıfır ve ikinci el araç piyasasını yakında buradan takip edebileceksiniz.</p>
                        <span style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Çok Yakında</span>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <CreditCard size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3>Banka Kredileri</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>İhtiyaç, konut ve taşıt kredilerini en uygun oranlarla karşılaştırın.</p>
                        <span style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Çok Yakında</span>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <ShieldCheck size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3>Güvenilir Veri</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Tüm veriler bankaların resmi web sitelerinden otomatik botlarımızla çekilmektedir.</p>
                    </div>
                </section >
            </main >

            <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', marginTop: 'auto', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.875rem' }}>
                <div className="container">
                    <p>© 2026 kiyas.tr - Tüm hakları saklıdır. Veriler bilgilendirme amaçlıdır.</p>
                </div>
            </footer>
        </div >
    );
}
