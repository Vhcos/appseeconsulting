import Explainer from "@/components/Explainer";

export default function ReportPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Reporte final (PDF)</h1>
        <p className="mt-2 text-muted-foreground">
          Esta etapa genera una versión cerrada del documento final. Después, el seguimiento no reescribe el pasado.
        </p>
      </div>

      <Explainer title="¿Qué significa “versión congelada”?">
        Cuando generamos el reporte, se crea una versión con su contenido guardado.
        Eso permite que el seguimiento (KPI) avance semana a semana sin cambiar lo que ya se presentó.
      </Explainer>
    </section>
  );
}
