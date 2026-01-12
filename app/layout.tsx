import './globals.css'

export const metadata = {
  title: 'Game 2026',
  description: 'Game Tết cho công ty',
  icons: {
    icon: '/icon-2026.png', 
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#DC143C" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body 
  className="min-h-screen"
  style={{
    backgroundImage: 'url(/bg-tet.png), linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #FF6347 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  }}
>
  {children}
</body>
    </html>
  )
}