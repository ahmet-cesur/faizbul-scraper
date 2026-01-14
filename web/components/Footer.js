export default function Footer() {
    return (
        <footer style={{ borderTop: '1px solid var(--border)', padding: '4rem 0', background: 'var(--background)' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
                <div>
                    <div className="logo" style={{ marginBottom: '1.5rem' }}>kiyas.tr</div>
                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        Türkiye'nin en hızlı ve güncel karşılaştırma platformu. Bağımsız, şeffaf, veriye dayalı.
                    </p>
                </div>
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '1.5rem' }}>Kategoriler</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li><a href="/mevduat" className="nav-link">Mevduat Faizleri</a></li>
                        <li><a href="#" className="nav-link">Araç Fiyatları</a></li>
                        <li><a href="#" className="nav-link">Banka Kredileri</a></li>
                        <li><a href="#" className="nav-link">Sigorta</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '1.5rem' }}>Kurumsal</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li><a href="#" className="nav-link">Hakkımızda</a></li>
                        <li><a href="/privacy" className="nav-link">Gizlilik Politikası</a></li>
                        <li><a href="#" className="nav-link">İletişim</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '1.5rem' }}>Bizi Takip Edin</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                    </div>
                </div>
            </div>
            <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8rem' }}>
                <p>© 2026 kiyas.tr Karşılaştırma Hizmetleri. Tüm hakları saklıdır.</p>
            </div>
        </footer>
    );
}
