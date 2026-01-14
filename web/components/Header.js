export default function Header({ activeTab }) {
    return (
        <header>
            <div className="container">
                <nav>
                    <a href="/" className="logo">kiyas.tr</a>
                    <div className="nav-links">
                        <a href="/mevduat" className={`nav-link ${activeTab === 'mevduat' ? 'active' : ''}`}>Mevduat</a>
                        <a href="#" className={`nav-link ${activeTab === 'arac' ? 'active' : ''}`}>Araç</a>
                        <a href="#" className={`nav-link ${activeTab === 'kredi' ? 'active' : ''}`}>Kredi</a>
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
    );
}
