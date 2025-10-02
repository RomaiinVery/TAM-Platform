import './globals.css';

export const metadata = {
  title: 'TAM Platform',
  description: 'RWA on-chain (Sepolia)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
