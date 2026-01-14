import { Car, CreditCard, Landmark, ShieldCheck, HeartPulse, Building2, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HomePage() {
    const categories = [
        {
            title: "Mevduat Faizleri",
            description: "En yüksek mevduat getirisi sağlayan bankaları anlık verilerle karşılaştırın.",
            icon: <Landmark size={32} color="var(--primary)" />,
            link: "/mevduat",
            status: "Aktif",
            color: "blue"
        },
        {
            title: "Araç Fiyatları",
            description: "Sıfır ve ikinci el araç piyasasını, teknik özellikleri ve fiyat değişimlerini takip edin.",
            icon: <Car size={32} color="#f59e0b" />,
            link: "#",
            status: "Çok Yakında",
            color: "orange"
        },
        {
            title: "Banka Kredileri",
            description: "İhtiyaç, konut ve taşıt kredilerini en uygun oranlarla hesaplayın.",
            icon: <CreditCard size={32} color="#10b981" />,
            link: "#",
            status: "Çok Yakında",
            color: "emerald"
        },
        {
            title: "Sigorta Teklifleri",
            description: "Kasko, trafik sigortası ve tamamlayıcı sağlık sigortası tekliflerini kıyaslayın.",
            icon: <HeartPulse size={32} color="#ef4444" />,
            link: "#",
            status: "Çok Yakında",
            color: "red"
        },
        {
            title: "Emlak Endeksi",
            description: "Bölgesel emlak fiyatları, kira endeksleri ve yatırım fırsatlarını analiz edin.",
            icon: <Building2 size={32} color="#8b5cf6" />,
            link: "#",
            status: "Çok Yakında",
            color: "purple"
        }
    ];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />

            <main className="container" style={{ flex: 1, padding: '4rem 1.5rem' }}>
                <section style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h1 style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(to right, #2563eb, #3b82f6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.5rem' }}>
                        Karar Vermeden Önce Kıyasla
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--secondary)', maxWidth: '700px', margin: '0 auto' }}>
                        Türkiye'nin bağımsız karşılaştırma platformu kiyas.tr ile finansal kararlarınızı, araç alımlarınızı ve hizmet seçimlerinizi veriye dayalı yapın.
                    </p>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {categories.map((cat, idx) => (
                        <a key={idx} href={cat.link} className="card" style={{
                            padding: '2.5rem',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            cursor: cat.status === 'Aktif' ? 'pointer' : 'default',
                            opacity: cat.status === 'Aktif' ? 1 : 0.85,
                            transform: 'translateZ(0)',
                            position: 'relative'
                        }}>
                            <div style={{ background: 'var(--accent)', width: '64px', height: '64px', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                {cat.icon}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{cat.title}</h2>
                                {cat.status === 'Aktif' ? (
                                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.1)' }}>AKTİF</span>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '99px', background: 'var(--accent)' }}>YAKINDA</span>
                                )}
                            </div>

                            <p style={{ color: 'var(--secondary)', fontSize: '1rem', lineHeight: '1.6', flex: 1, marginBottom: '2rem' }}>
                                {cat.description}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', color: cat.status === 'Aktif' ? 'var(--primary)' : 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem', gap: '0.25rem' }}>
                                {cat.status === 'Aktif' ? 'Hemen Kıyasla' : 'Haber Ver'} <ChevronRight size={18} />
                            </div>
                        </a>
                    ))}
                </div>

                <section style={{ marginTop: '8rem', padding: '4rem', background: 'var(--accent)', borderRadius: '2rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '4rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>Verinin Gücü Cebinizde</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--secondary)', lineHeight: '1.8', marginBottom: '2rem' }}>
                            FaizBul mobil uygulaması ile anlık bildirimler alın, kişiselleştirilmiş finansal asistanınızla en doğru yatırımı yapın. 100.000+ kullanıcıya siz de katılın.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <a href="https://play.google.com/store/apps/details?id=com.acesur.faizbul" target="_blank" className="btn-primary">Google Play'den İndir</a>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '200px', height: '200px', background: 'var(--primary)', borderRadius: '2rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 900 }}>
                            FaizBul
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
