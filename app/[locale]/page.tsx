import Link from 'next/link';

export default async function LocaleHome({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const other = locale === 'es' ? 'en' : 'es';

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link href="/es">ES</Link>
        <Link href="/en">EN</Link>
        <span style={{ opacity: 0.6 }}>Actual: {locale}</span>
      </div>

      <h1>seeconsulting.cl</h1>
      <p>
        Primero levantamos (Wizard). Después generamos el Reporte final (PDF). Y luego hacemos
        seguimiento semanal/mensual de KPI con alertas.
      </p>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <Link href={`/${locale}/wizard`}>Ir a Wizard</Link>
        <Link href={`/${locale}/report`}>Ir a Reporte (PDF)</Link>
        <Link href={`/${other}`}>Cambiar a {other.toUpperCase()}</Link>
      </div>
    </main>
  );
}
