import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Kiyas.tr | Türkiye'nin En Kapsamlı Karşılaştırma Platformu",
    description: "Mevduat faizleri, araç fiyatları ve daha fazlasını anlık verilerle karşılaştırın.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="tr">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
