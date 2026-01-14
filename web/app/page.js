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
                        <a href="https://play.google.com/store/apps/details?id=com.acesur.faizbul" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#000', color: '#fff', borderRadius: '8px', border: '1px solid #333' }}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="#4285F4" d="M3 20.5v-17c0-.9.7-1.3 1.4-.8l10.8 9c.4.3.4.9 0 1.2l-10.8 9c-.7.5-1.4.1-1.4-.4z" />
                                <path fill="#EA4335" d="M19.3 12L4.4 22c-.6.4-1.4 0-1.4-.8v-2.4l13.5-9c.4-.3.4-.9 0-1.2L3 3.4V1c0-.8.8-1.2 1.4-.8l14.9 10c.8.5.8 1.3 0 1.8z" />
                                <path fill="#FBBC05" d="M15.2 12L3 20.1V3.9L15.2 12z" />
                                <path fill="#34A853" d="M15.2 12L3 3.9c0-.9.7-1.3 1.4-.8l10.8 9c.4.3.4.9 0 1.2z" opacity="0.1" />
                            </svg>
                            <div style={{ textAlign: 'left', lineHeight: '1.1' }}>
                                <div style={{ fontSize: '10px', fontWeight: 500, opacity: 0.8 }}>GET IT ON</div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>Google Play</div>
                            </div>
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
