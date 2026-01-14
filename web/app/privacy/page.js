import Header from '../../components/Header';
import Footer from '../../components/Footer';

export const metadata = {
    title: "Gizlilik Politikası | Kiyas.tr",
    description: "Kiyas.tr gizlilik politikası ve veri kullanımı hakkında bilgiler.",
};

export default function PrivacyPage() {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />

            <main className="container" style={{ flex: 1, padding: '4rem 1.5rem' }}>
                <div className="card" style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Gizlilik Politikası</h1>

                    <div style={{ color: 'var(--secondary)', lineHeight: '1.8' }}>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Son güncelleme: 14 Ocak 2026
                        </p>

                        <h2 style={{ color: 'var(--foreground)', marginTop: '2rem', marginBottom: '1rem' }}>1. Veri Toplama</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Kiyas.tr, kullanıcılarından herhangi bir kişisel veri (isim, soyisim, e-posta, telefon vb.) toplamamaktadır. Web sitemiz tamamen anonim kullanım üzerine tasarlanmıştır.
                        </p>

                        <h2 style={{ color: 'var(--foreground)', marginTop: '2rem', marginBottom: '1rem' }}>2. Çerez Kullanımı</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Sitemiz, kullanıcı deneyimini iyileştirmek ve trafik analizi yapmak (Google Analytics gibi) amacıyla teknik çerezler kullanabilir. Bu çerezler kişisel kimlik tespiti yapmaz.
                        </p>

                        <h2 style={{ color: 'var(--foreground)', marginTop: '2rem', marginBottom: '1rem' }}>3. Üçüncü Taraf Bağlantıları</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Sitemizde yer alan banka veya diğer hizmet sağlayıcı bağlantıları, ilgili kurumların kendi web sitelerine yönlendirme yapar. Bu sitelerin gizlilik politikalarından Kiyas.tr sorumlu tutulamaz.
                        </p>

                        <h2 style={{ color: 'var(--foreground)', marginTop: '2rem', marginBottom: '1rem' }}>4. Veri Güvenliği</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Sitemizde görüntülenen faiz oranları ve fiyat verileri bilgilendirme amaçlıdır. Verilerin doğruluğu için botlarımız periyodik olarak banka web sitelerini taramaktadır, ancak kesin bilgi için ilgili bankayla iletişime geçilmesi önerilir.
                        </p>

                        <h2 style={{ color: 'var(--foreground)', marginTop: '2rem', marginBottom: '1rem' }}>5. İletişim</h2>
                        <p>
                            Gizlilik politikamız hakkındaki sorularınız için iletisim@kiyas.tr adresinden bize ulaşabilirsiniz.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
