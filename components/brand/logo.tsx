type LogoProps = {
  /** Tamaño del isotipo en px. */
  size?: number;
  /** Muestra el nombre junto al isotipo. */
  withWordmark?: boolean;
  /** Clases extra para el nombre (p. ej. helpers del sidebar contraído). */
  wordmarkClassName?: string;
  /** Variante para el panel de marca (sobre el degradado del tema). */
  inverted?: boolean;
};

/**
 * Isotipo de TeleMed Rural: una cruz médica atravesada por un trazo de electrocardiograma
 * y un punto de señal (la sincronización al recuperar la cobertura). Toma sus colores del
 * tema activo (--app-logo-*); en SVG van como `style` porque los atributos de presentación
 * no aceptan var().
 */
export function Logo({ size = 32, withWordmark = true, wordmarkClassName = "", inverted = false }: LogoProps) {
  const stroke = inverted ? "var(--app-logo-inverted-stroke)" : "var(--app-logo-stroke)";
  return (
    <>
      <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="telemed-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--app-logo-from)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-logo-to)" }} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" style={{ fill: inverted ? "var(--app-logo-inverted-bg)" : "url(#telemed-logo-gradient)" }} />
        {/* Cruz médica */}
        <path
          d="M12.6 6.5h6.8v6.1h6.1v6.8h-6.1v6.1h-6.8v-6.1H6.5v-6.8h6.1z"
          fill="none"
          strokeWidth="1.7"
          strokeLinejoin="round"
          style={{ stroke, opacity: 0.55 }}
        />
        {/* Trazo de electrocardiograma */}
        <path d="M5 16.4h6l1.7-3.6 2.7 7.4 2.3-5.6 1.4 1.8H27" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke }} />
        {/* Señal / sincronización */}
        <circle cx="25.4" cy="6.6" r="2.2" style={{ fill: inverted ? "var(--app-accent)" : "var(--app-logo-dot)" }} />
      </svg>
      {withWordmark && (
        <span className={`brand-wordmark ${wordmarkClassName}`}>
          TeleMed <span style={inverted ? { color: "var(--app-aside-wordmark)" } : undefined}>Rural</span>
        </span>
      )}
    </>
  );
}
