import './globals.css';
import Sidebar from "@/components/Sidebar";
import ConnectWallet from '@/components/ConnectWallet';

export const metadata = {
  title: 'TAM Platform',
  description: 'RWA on-chain (Sepolia)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex bg-[#0e0e0e] text-gray-200 min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-end p-4 border-b border-[#1f1f1f] bg-[#141414]">
            <ConnectWallet />
          </header>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
