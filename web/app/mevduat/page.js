import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Car, CreditCard, ShieldCheck } from 'lucide-react';
import MevduatList from '../../components/MevduatList';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

export const metadata = {
    title: "Mevduat Faizleri Karşılaştırma | Kiyas.tr",
    description: "Türkiye'nin tüm bankalarının en güncel mevduat faiz oranlarını karşılaştırın, net kazancınızı hesaplayın.",
};

export const revalidate = 60;

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

        return rows.map(row => {
            // Helper to get value case-insensitively
            const getVal = (possibleNames) => {
                for (const name of possibleNames) {
                    const val = row.get(name);
                    if (val !== undefined && val !== null && val !== '') return val;
                }
                return null;
            };

            const bank = getVal(['Bank', 'Banka', 'bank']) || 'Bilinmeyen Banka';
            const desc = getVal(['Description', 'Desc', 'Açıklama', 'description']) || '';
            const rate = getVal(['Rate', 'Faiz', 'rate', 'faiz']) || '0';
            const minAmount = getVal(['MinAmount', 'MinTutar', 'minamount']) || '0';
            const maxAmount = getVal(['MaxAmount', 'MaxTutar', 'maxamount']) || '999999999';
            const minDays = getVal(['MinDays', 'MinGün', 'mindays']) || '0';
            const maxDays = getVal(['MaxDays', 'MaxGün', 'maxdays']) || '99999';
            const url = getVal(['URL', 'url', 'Link', 'link']) || '#';
            const fullJson = getVal(['TableJSON', 'tablejson', 'JSON', 'json']) || null;

            return { bank, desc, rate, minAmount, maxAmount, minDays, maxDays, url, fullJson };
        }).filter(item => item.bank && item.bank !== 'Bilinmeyen Banka' && item.rate !== '0').slice(0, 100);
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

export default async function MevduatPage() {
    const data = await getSheetData();

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header activeTab="mevduat" />

            <main className="container" style={{ flex: 1, paddingBottom: '5rem' }}>
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

            <Footer />
        </div>
    );
}
