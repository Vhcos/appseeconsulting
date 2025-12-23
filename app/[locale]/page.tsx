import Link from "next/link";

type ParamsPromise = Promise<{ locale: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function LandingPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale } = await params;

  const isEn = locale === "en";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-0">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
              SE
            </span>
            <span>SEEConsulting</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href={`/${locale}#como-funciona`} className="hover:text-white">
              {t(locale, "Cómo funciona", "How it works")}
            </Link>
            <Link href={`/${locale}#caracteristicas`} className="hover:text-white">
              {t(locale, "Características", "Features")}
            </Link>
            <Link href={`/${locale}#sectores`} className="hover:text-white">
              {t(locale, "Sectores", "Sectors")}
            </Link>
            <Link
              href={`/${locale}/wizard`}
              className="inline-flex items-center rounded-full border border-indigo-400/60 px-3 py-1 text-xs font-medium text-indigo-100 hover:border-indigo-300 hover:text-white"
            >
              {t(locale, "Entrar al wizard", "Open wizard")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-0 lg:pt-16">
        {/* HERO */}
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              {t(
                locale,
                "Roadmap estratégico en 20 semanas",
                "20-week strategic roadmap"
              )}
            </p>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t(
                locale,
                "Convierte tu estrategia en un plan claro y ejecutable",
                "Turn your strategy into a clear, executable plan"
              )}
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              {t(
                locale,
                "SEEConsulting ordena tu diagnóstico, tus KPI y tus iniciativas en un solo lugar, para que dejes de vivir en excels y presentaciones sueltas.",
                "SEEConsulting organizes your diagnosis, KPIs and initiatives in one place, so you can stop living in spreadsheets and scattered slide decks."
              )}
            </p>

            {/* EMAIL CTA */}
            <form
              action={`/${locale}/wizard`}
              method="GET"
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <label className="sr-only" htmlFor="email">
                {t(locale, "Correo electrónico", "Email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder={t(
                  locale,
                  "Ingresa tu correo corporativo",
                  "Enter your work email"
                )}
                className="w-full rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400"
              >
                {t(locale, "Empieza con tu correo", "Start with your email")}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                {t(
                  locale,
                  "Crea un engagement demo en minutos. Sin tarjeta.",
                  "Create a demo engagement in minutes. No credit card."
                )}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:inline-block" />
              <Link
                href={`/${locale}/report`}
                className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
              >
                <span>
                  {t(locale, "Ver ejemplo de informe", "See sample report")}
                </span>
                <span aria-hidden>↗</span>
              </Link>
            </div>
          </div>

          {/* Mockup placeholder */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -translate-x-6 translate-y-6 rounded-3xl bg-indigo-500/30 blur-3xl" />
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">
                  {t(locale, "Panel estratégico See", "See strategy board")}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  {t(locale, "En rumbo", "On track")}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-medium text-slate-400">
                    {t(locale, "Balanced Scorecard", "Balanced Scorecard")}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                    <li>• {t(locale, "Finanzas: Margen EBITDA", "Finance: EBITDA margin")} ↑</li>
                    <li>• {t(locale, "Clientes: NPS contratos clave", "Customers: Key accounts NPS")} ↑</li>
                    <li>• {t(locale, "Procesos: Cumplimiento HSEC", "Processes: HSEC compliance")} ↗</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-medium text-slate-400">
                    {t(locale, "Roadmap 20 semanas", "20-week roadmap")}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className="h-1.5 w-2/5 rounded-full bg-indigo-400" />
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className="h-1.5 w-3/4 rounded-full bg-emerald-400" />
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className="h-1.5 w-1/3 rounded-full bg-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:col-span-2">
                  <p className="text-[11px] font-medium text-slate-400">
                    {t(locale, "Próxima reunión de seguimiento", "Next governance meeting")}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {t(
                      locale,
                      "Comité estratégico · Lunes 09:00 · Revisamos avances del roadmap y riesgos críticos.",
                      "Strategy committee · Monday 9:00 · Review roadmap progress and critical risks."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section
          id="caracteristicas"
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">
              {t(locale, "Metodología probada", "Proven methodology")}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {t(
                locale,
                "Basada en anexos e informes aplicados en empresas de minería y servicios B2B en Latinoamérica.",
                "Based on annexes and reports used in real mining and B2B services companies in Latin America."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">
              {t(locale, "Roadmap en 20 semanas", "20-week roadmap")}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {t(
                locale,
                "Desde el diagnóstico 360 hasta la implementación, con quick wins y responsables claros.",
                "From 360° diagnosis to implementation, with quick wins and clear owners."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">
              {t(locale, "Un solo hub de estrategia", "A single strategy hub")}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {t(
                locale,
                "Objetivos, KPI (Key Performance Indicators), iniciativas, riesgos y decisiones conectados.",
                "Objectives, KPIs (Key Performance Indicators), initiatives, risks and decisions connected."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">
              {t(locale, "Listo para directorio", "Board-ready")}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {t(
                locale,
                "Informes claros que puedes presentar a socios, bancos o directorio sin editar en PowerPoint.",
                "Clear reports you can present to partners, banks or your board without extra PowerPoint work."
              )}
            </p>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="mt-16 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t(locale, "¿Cómo funciona SEEConsulting?", "How does SEEConsulting work?")}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t(
                locale,
                "Seguimos un flujo en 9 pasos, desde el contexto y el diagnóstico hasta el informe final y la gobernanza.",
                "We follow a 9-step flow, from context and diagnosis to final report and governance."
              )}
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-200">
            <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <span className="text-xs font-medium text-indigo-300">
                1. {t(locale, "Contexto", "Context")}
              </span>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Describes tu empresa, rubro y metas a 12 y 36 meses. Dejamos clara la ficha del engagement.",
                  "Describe your company, industry and 12/36-month goals. We capture a clear engagement profile."
                )}
              </p>
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <span className="text-xs font-medium text-indigo-300">
                2. {t(locale, "Diagnóstico 360°", "360° diagnosis")}
              </span>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Ordenas tu Data Room, encuestas e entrevistas. SEE te ayuda a convertirlo en brechas claras.",
                  "You organize your Data Room, surveys and interviews. SEE helps you turn it into clear gaps."
                )}
              </p>
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <span className="text-xs font-medium text-indigo-300">
                3. {t(locale, "Estrategia y BSC", "Strategy & BSC")}
              </span>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Definen visión, misión, objetivos y KPI. La plataforma arma tu Balanced Scorecard.",
                  "You define vision, mission, objectives and KPIs. The platform builds your Balanced Scorecard."
                )}
              </p>
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <span className="text-xs font-medium text-indigo-300">
                4. {t(locale, "Roadmap y gobernanza", "Roadmap & governance")}
              </span>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Priorizas iniciativas, construyes el roadmap de 20 semanas y defines comités y seguimientos.",
                  "You prioritize initiatives, build the 20-week roadmap and define committees and follow-ups."
                )}
              </p>
            </li>
          </ol>
        </section>

        {/* SECTORES */}
        <section id="sectores" className="mt-16 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t(locale, "Hecho para empresas reales", "Built for real companies")}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t(
                locale,
                "Especialmente útil para organizaciones con muchos contratos, proyectos y reportes.",
                "Especially useful for organizations with many contracts, projects and reports."
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="font-semibold">
                {t(locale, "Minería y servicios", "Mining & services")}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Ordena contratos, operaciones y KPIs HSEC sin perderte en excels.",
                  "Organize contracts, operations and HSEC KPIs without drowning in spreadsheets."
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="font-semibold">
                {t(locale, "Construcción y obras públicas", "Construction & public works")}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Conecta tu estrategia con licitaciones, contratos de largo plazo y flujos de caja.",
                  "Connect your strategy with tenders, long-term contracts and cash flows."
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="font-semibold">
                {t(locale, "Empresas B2B en crecimiento", "Growing B2B companies")}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {t(
                  locale,
                  "Alinea equipos, KPI e iniciativas sin perder foco en el negocio core.",
                  "Align teams, KPIs and initiatives without losing focus on your core business."
                )}
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mt-16 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/70 to-fuchsia-500/70 p-6 text-slate-50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {t(
                  locale,
                  "¿Listo para ver tu estrategia en un solo lugar?",
                  "Ready to see your strategy in one place?"
                )}
              </h2>
              <p className="mt-1 text-sm text-indigo-100">
                {t(
                  locale,
                  "Empieza con un engagement demo y en minutos tendrás tu primer roadmap.",
                  "Start with a demo engagement and get your first roadmap in minutes."
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/wizard`}
                className="inline-flex items-center justify-center rounded-full bg-slate-950/90 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-900"
              >
                {t(locale, "Empieza ahora", "Start now")}
              </Link>
              <Link
                href={`/${locale}/report`}
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-slate-50 hover:bg-white/15"
              >
                {t(locale, "Ver ejemplo de informe", "See sample report")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-0">
          <p>
            © {new Date().getFullYear()} SEEConsulting.{" "}
            {t(locale, "Todos los derechos reservados.", "All rights reserved.")}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href={`/${locale}`} className="hover:text-slate-300">
              {t(locale, "Términos", "Terms")}
            </Link>
            <Link href={`/${locale}`} className="hover:text-slate-300">
              {t(locale, "Privacidad", "Privacy")}
            </Link>
            <Link href={`/${locale}`} className="hover:text-slate-300">
              {t(locale, "Contacto", "Contact")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
