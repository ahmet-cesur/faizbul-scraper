import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Car, CreditCard, ShieldCheck } from 'lucide-react';
import MevduatList from './MevduatList';

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

export const revalidate = 3600;

async function getSheetData() {
    try {
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!serviceAccountEmail || !privateKey) {
            console.warn('Missing Google Credentials, using mock data');
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

        // Mapping using column names. Note: GoogleSpreadsheet uses the first row as headers.
        // If headers aren't perfect, we can fallback to indices.
        return rows.map(row => {
            // row._rawData might be available depending on version, 
            // but let's try standard get() first with common header mappings.
            const bank = row.get('Bank') || row.get('Banka') || row.get('bank') || 'Bilinmeyen Banka';
            const desc = row.get('Desc') || row.get('Açıklama') || row.get('description') || '';
            const rate = row.get('Rate') || row.get('Faiz') || row.get('rate') || '0';
            const minAmount = row.get('MinAmount') || row.get('MinTutar') || '0';
            const maxAmount = row.get('MaxAmount') || row.get('MaxTutar') || '999999999';
            const minDays = row.get('MinDays') || row.get('MinGün') || '0';
            const maxDays = row.get('MaxDays') || row.get('MaxGün') || '99999';
            const url = row.get('URL') || row.get('url') || '#';
            const fullJson = row.get('JSON') || row.get('json') || null;

            return { bank, desc, rate, minAmount, maxAmount, minDays, maxDays, url, fullJson };
        }).filter(item => item.bank && item.rate !== '0').slice(0, 100);
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return getMockData();
    }
}

function getMockData() {
    return [
        { bank: 'Akbank', desc: 'Tanışma Faizi', rate: '54.00', minAmount: '1000', maxAmount: '500000', minDays: '32', maxDays: '92', url: 'https://www.akbank.com', fullJson: null },
        { bank: 'Garanti BBVA', desc: 'E-Vadeli', rate: '52.50', minAmount: '5000', maxAmount: '1000000', minDays: '32', maxDays: '365', url: 'https://www.garantibbva.com.tr', fullJson: null },
        { bank: 'Ziraat Bankası', desc: 'Vadeli Mevduat', rate: '48.00', minAmount: '1000', maxAmount: '10000000', minDays: '32', maxDays: '365', url: 'https://www.ziraatbank.com.tr', fullJson: null },
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
                        <a href="https://play.google.com/store/apps/details?id=com.acesur.faizbul" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186c-.18.18-.346.12-.457-.064L3.003 2.015c-.056-.252.2-.331.606-.201zm11.109 9.14l3.193 1.831c.749.43.749 1.13 0 1.56l-3.193 1.83-2.903-2.91 2.903-2.911zm-3.844-3.845l3.158-3.158 3.03 1.738c.749.43.749 1.13 0 1.56L14.032 9.1l-3.158-1.991zm0 9.782l3.158 1.99 3.03 1.73c.749.43.749 1.13 0 1.56l-3.03 1.738-3.158-3.158V16.89z" />
                            </svg>
                            <span>Uygulamayı İndir</span>
                        </a>
                    </nav>
                </div>
            </header>

            <main className="container" style={{ paddingBottom: '5rem' }}>
                <section className="hero">
                    <h1>Paranızın Değerini <span style={{ color: 'var(--primary)' }}>Kıyaslayın</span></h1>
                    <p>Türkiye'deki tüm bankaların güncel mevduat faiz oranlarını anlık olarak karşılaştırın, en yüksek getiriyi bulun.</p>
                </section>

                <MevduatList initialData={data} />

                <section style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ background: 'var(--accent)', width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <Car size={32} color="var(--primary)" />
                        </div>
                        <h3>Araç Fiyatları</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.75rem' }}>Sıfır ve ikinci el araç piyasasını anlık olarak buradan takip edebileceksiniz.</p>
                        <span style={{ display: 'inline-block', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Çok Yakında</span>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ background: 'var(--accent)', width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <CreditCard size={32} color="var(--primary)" />
                        </div>
                        <h3>Banka Kredileri</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.75rem' }}>İhtiyaç, konut ve taşıt kredilerini en uygun oranlarla karşılaştırın.</p>
                        <span style={{ display: 'inline-block', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Çok Yakında</span>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ background: 'var(--accent)', width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <ShieldCheck size={32} color="var(--primary)" />
                        </div>
                        <h3>Güvenilir Veri</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', marginTop: '0.75rem' }}>Tüm veriler bankaların resmi web sitelerinden otomatik botlarımızla çekilmektedir.</p>
                    </div>
                </section>
            </main>

            <footer style={{ borderTop: '1px solid var(--border)', padding: '3rem 0', marginTop: 'auto', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.875rem' }}>
                <div className="container">
                    <p>© 2026 kiyas.tr - Türkiye'nin Bağımsız Karşılaştırma Platformu</p>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <a href="#" className="nav-link">Hakkımızda</a>
                        <a href="#" className="nav-link">Kullanım Koşulları</a>
                        <a href="#" className="nav-link">İletişim</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
