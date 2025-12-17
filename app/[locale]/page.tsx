import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Etapa 0</div>
          <div className="mt-1 text-lg font-semibold">Wizard</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Preguntas, evidencias y tablas base. Aquí se construye la verdad del proyecto.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Etapa 1</div>
          <div className="mt-1 text-lg font-semibold">Reporte final (PDF)</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Documento final versionado y “congelado”. Esto es lo que se presenta.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Etapa 2</div>
          <div className="mt-1 text-lg font-semibold">Seguimiento KPI</div>
          <p className="mt-2 text-sm text-muted-foreground">
            KPI por periodicidad con semáforo verde/rojo y reportes por email/WhatsApp.
          </p>
        </div>
      </div>
    </section>
  );
}
