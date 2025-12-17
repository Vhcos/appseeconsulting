import Explainer from "@/components/Explainer";
import { useTranslations } from "next-intl";

export default function WizardPage() {
  const t = useTranslations("wizard");

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("lead")}</p>
      </div>

      <Explainer title="¿Qué pasa con esta información después?">
        Todo lo que llenes aquí alimenta el Reporte final (PDF) y define los KPI (Indicador Clave de Desempeño)
        que se van a seguir en la etapa de seguimiento. Si algo no tiene evidencia, queda marcado para cerrar.
      </Explainer>

      <div className="rounded-2xl border bg-card p-6">
        <div className="text-sm text-muted-foreground">Próximo paso</div>
        <div className="mt-1 text-lg font-semibold">Banco de preguntas + evidencias</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Aquí vamos a cargar tus preguntas (entrevistas/encuestas) y a registrar respuestas con evidencia.
        </p>
      </div>
    </section>
  );
}
