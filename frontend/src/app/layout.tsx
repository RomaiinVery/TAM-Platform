import './globals.css';
import Sidebar from "@/components/Sidebar";
import ConnectWallet from '@/components/ConnectWallet';
import PageTransition from '@/components/PageTransition';

export const metadata = {
  title: 'TAM Platform',
  description: 'RWA on-chain (Sepolia)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d0d] text-gray-100">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="flex justify-end mb-6">
              <ConnectWallet />
            </div>

            {/* 🚀 Ici la transition entre pages */}
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </body>
    </html>
  );
}
