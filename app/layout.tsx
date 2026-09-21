import type {Metadata} from 'next';
import './globals.css';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import {connection} from 'next/server';
import {auth} from '@/auth';
import {isAuthDisabled, isLocalAuth} from '@/auth.config';

export const metadata: Metadata = {
  title: 'WeeMeal - Dein Rezeptbuch',
  description: 'Dein digitales Rezeptbuch mit Einkaufslisten-Integration fuer die Bring! App',
  icons: {
    icon: {url: '/favicon.png', type: 'image/png'},
    apple: '/logo192.png',
  },
};

export default async function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    // Der Auth-Modus ist eine Laufzeit-Entscheidung (ADR 0003). Ohne diese
    // Zeile fasst das Layout im none-Modus nichts Request-Abhängiges an — und
    // ein Build ohne AUTH_MODE (wie im Docker-Image) rendert Seiten wie `/`
    // dann einmalig statisch vor: ohne Session, auch wenn der Container
    // später mit AUTH_MODE=keycloak läuft. Die Navbar bliebe dauerhaft leer.
    await connection();

    // Im none-Modus wird Auth.js nicht angefasst — es gibt keine Session.
    const session = isAuthDisabled() ? null : await auth();

    return (
        <html lang="de">
        <head>
          {/* Inter font for modern typography */}
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
          <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
              rel="stylesheet"
          />
        </head>
        <body className="min-h-screen flex flex-col bg-background">
        <Navbar
            username={session?.user?.name}
            isAdmin={session?.user?.role === 'admin'}
            canManageUsers={session?.user?.role === 'admin' && isLocalAuth()}
            canChangePassword={session?.authMode === 'local'}
        />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
        </main>
        <Footer/>
        </body>
        </html>
    );
}
