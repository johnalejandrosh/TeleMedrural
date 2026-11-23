import type { Metadata } from "next";
import { Figtree, IBM_Plex_Mono, Lexend } from "next/font/google";
import "@/styles/theme.scss";
import { DEFAULT_APP_THEME, themeInitScript } from "@/lib/theme/init-script";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Lexend({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "TeleMed Rural",
    template: "%s · TeleMed Rural",
  },
  description:
    "Panel de telemedicina diferida: casos registrados sin conexión por promotores de salud rurales, pre-triaje NEWS2 y observaciones del personal de salud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // El script de abajo fija data-coreui-theme y data-app-theme antes de hidratar; de ahí suppressHydrationWarning.
    // data-scroll-behavior: CoreUI activa scroll suave en <html>; así Next lo desactiva durante la navegación.
    <html
      lang="es"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      data-scroll-behavior="smooth"
      data-app-theme={DEFAULT_APP_THEME}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
