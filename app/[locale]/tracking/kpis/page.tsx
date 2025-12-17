import Explainer from "@/components/Explainer";

export default function TrackingKpisPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Seguimiento de KPI</h1>
        <p className="mt-2 text-muted-foreground">
          Aquí se cargan KPI según su periodicidad (semanal, mensual, trimestral, anual) y se reporta con semáforo verde/rojo.
        </p>
      </div>

      <Explainer title="Regla simple del semáforo (solo verde/rojo)">
        Verde: cumple la meta. Rojo: no cumple o falta el dato cuando correspondía.
        Si un KPI es mensual (o trimestral/anual) y ya fue cargado, se respeta para todo el periodo.
      </Explainer>
    </section>
  );
}
