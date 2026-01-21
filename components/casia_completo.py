import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.dates as mdates
from datetime import datetime
import os
import webbrowser

# ==========================================
# CONFIGURACIÓN DE ESTILO GLOBAL (PREMIUM)
# ==========================================
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial']
plt.rcParams['text.color'] = 'white'
plt.rcParams['axes.edgecolor'] = '#334155'
# Colores Casia DeepTech
C_ACCENT = "#06b6d4" # Cian
C_SEC = "#64748b"    # Slate
C_BG = "#0f172a"     # Fondo Dark

# ==========================================
# 1. GENERADOR DE GRÁFICOS (LOS 3 ARTEFACTOS)
# ==========================================

def generar_todos_los_graficos():
    print("Generando gráficos estratégicos...")

    # --- GRÁFICO A: VISTA DIRECTORIO (ALINEAMIENTO) ---
    fig, ax = plt.subplots(figsize=(12, 6))
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 5.5)
    ax.axis('off')

    # Caja 1: Focos (Verde)
    rect1 = patches.FancyBboxPatch((0.5, 0.5), 3.5, 4, boxstyle="round,pad=0.2", fc="rgba(16, 185, 129, 0.1)", ec="#10b981", linewidth=2)
    ax.add_patch(rect1)
    ax.text(2.25, 4, "DÓNDE GANAMOS\n(Focos)", ha='center', fontsize=12, fontweight='bold', color="#10b981")
    ax.text(2.25, 2.5, "• Internacionalización\n(Perú/Arg)\n\n• Mercado Contratistas\n\n• Bioseal Selectivo\n(Alto Potencial)", ha='center', va='center', fontsize=10, color="white")

    # Caja 2: Renuncias (Rojo)
    rect2 = patches.FancyBboxPatch((4.5, 0.5), 3, 4, boxstyle="round,pad=0.2", fc="rgba(239, 68, 68, 0.1)", ec="#ef4444", linewidth=2)
    ax.add_patch(rect2)
    ax.text(6, 4, "QUÉ NO HACEMOS\n(Renuncias)", ha='center', fontsize=12, fontweight='bold', color="#ef4444")
    ax.text(6, 2.5, "❌ Diversificación\nNo Core\n\n(Foco total en Escala)", ha='center', va='center', fontsize=11, color="white")

    # Caja 3: Mandato (Dorado)
    rect3 = patches.FancyBboxPatch((8, 0.5), 3.5, 4, boxstyle="round,pad=0.2", fc="rgba(245, 158, 11, 0.1)", ec="#f59e0b", linewidth=2)
    ax.add_patch(rect3)
    ax.text(9.75, 4, "MANDATO A PGX\n(La Respuesta)", ha='center', fontsize=12, fontweight='bold', color="#f59e0b")
    ax.text(9.75, 2.5, "✓ Roadmap con Responsables\n\n✓ Plan de Capacidades\n(Tech + People)\n\n✓ Sistema de Gobierno", ha='center', va='center', fontsize=10, color="white")

    plt.tight_layout()
    plt.savefig("chart_directorio.svg", format='svg', transparent=True)
    plt.close()

    # --- GRÁFICO B: VISIÓN 2028 (LA MONTAÑA) ---
    years = [2026, 2027, 2028]
    revenue = [10.4, 16.0, 20.0]
    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    ax.plot(years, revenue, color=C_ACCENT, marker="o", linewidth=4, markersize=15, markerfacecolor=C_BG, markeredgewidth=3, markeredgecolor=C_ACCENT)
    ax.fill_between(years, revenue, color=C_ACCENT, alpha=0.1)
    for i, txt in enumerate(revenue):
        ax.annotate(f"${txt}MM", (years[i], revenue[i]), xytext=(0, 20), textcoords='offset points', ha='center', fontsize=14, fontweight='bold', color='white')
    ax.set_xticks(years)
    ax.set_ylim(5, 24)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig("chart_vision.svg", format='svg', transparent=True)
    plt.close()

    # --- GRÁFICO C: ROADMAP GANTT (EL FORMATO) ---
    hitos = [
        ("Caja 13 Semanas", "2026-02-15", "#3b82f6"),
        ("Estándar HSEC", "2026-03-01", "#f97316"),
        ("Director Comercial", "2026-03-30", "#22c55e"),
        ("Data Pack V1", "2026-04-15", "#a855f7"),
        ("Oferta Premium", "2026-05-01", "#ef4444"),
        ("Roadmap Producto", "2026-11-15", "#06b6d4")
    ]
    fig, ax = plt.subplots(figsize=(12, 3))
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    dates = [datetime.strptime(h[1], "%Y-%m-%d") for h in hitos]
    levels = [1, -1, 1.5, -1.5, 1, -1]
    ax.hlines(0, min(dates), max(dates), color=C_SEC, linewidth=2)
    ax.vlines(dates, 0, levels, color=C_SEC, linestyle=":", alpha=0.5)
    for i, d in enumerate(dates):
        ax.plot(d, levels[i], "o", color=hitos[i][2], markersize=10)
        ax.text(d, levels[i] + (0.4 if levels[i] > 0 else -0.6), hitos[i][0], ha="center", fontsize=10, fontweight='bold', color='white', bbox=dict(boxstyle="round,pad=0.2", fc="#1e293b", ec=hitos[i][2], alpha=0.9))
    ax.axis('off')
    plt.tight_layout()
    plt.savefig("chart_roadmap.svg", format='svg', transparent=True)
    plt.close()


# ==========================================
# 2. GENERADOR DE LA PRESENTACIÓN HTML
# ==========================================

html_template = """
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Sesión Validación Casia</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/black.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;600;800&family=Montserrat:wght@700&display=swap" rel="stylesheet">
    <style>
        :root { --bg-dark: #0f172a; --glass: rgba(30, 41, 59, 0.8); --accent: #06b6d4; --gold: #f59e0b; }
        body { background-color: var(--bg-dark); font-family: 'Inter', sans-serif; }
        .reveal h1, .reveal h2 { font-family: 'Montserrat', sans-serif; text-transform: uppercase; }
        .reveal h1 { background: -webkit-linear-gradient(0deg, #fff, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .reveal h2 { color: var(--accent); border-bottom: 2px solid var(--accent); display: inline-block; }
        .card { background: var(--glass); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); margin: 10px; }
        .decision { border-left: 5px solid var(--gold); background: rgba(245, 158, 11, 0.1); padding: 15px; text-align: left; margin-top: 20px; }
        img.chart { width: 100%; filter: drop-shadow(0 0 10px rgba(6,182,212,0.3)); }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">

            <section>
                <p style="color:var(--accent); font-weight:bold; letter-spacing:3px;">SESIÓN DE VALIDACIÓN</p>
                <h1>SISTEMA DE GESTIÓN</h1>
                <h3>CASIA 2026-2028</h3>
                <div class="card" style="display:inline-block; margin-top:30px;">
                    "No venimos a ver números. Venimos a aprobar la <b>forma de gobernar</b> el escalamiento."
                </div>
            </section>

            <section>
                <h2>1. El Mandato (Noviembre)</h2>
                <p style="font-size:0.8em">Antes de ver el plan, confirmemos que responde a lo que pidió el Directorio.</p>
                <div class="fragment fade-up">
                    <img src="chart_directorio.svg" class="chart">
                </div>
                <div class="decision fragment">
                    <b style="color:var(--gold)">CHECK 1:</b> ¿Estamos de acuerdo que este plan debe responder a estos 3 mandatos?
                </div>
            </section>

            <section>
                <h2>2. El Estándar de Reporte</h2>
                <div class="grid-2">
                    <div style="align-self:center; text-align:left;">
                        <p>Del Directorio a la Operación:</p>
                        <ul style="list-style:none; padding:0;">
                            <li>🎯 <b>OBJETIVO</b> (Estrategia)</li>
                            <li>⬇</li>
                            <li>📊 <b>KPI</b> (Medición)</li>
                            <li>⬇</li>
                            <li>🚀 <b>INICIATIVA</b> (Proyecto)</li>
                        </ul>
                    </div>
                    <div>
                        <p style="font-size:0.6em">Ejemplo del Artefacto Visual:</p>
                        <img src="chart_roadmap.svg" class="chart">
                    </div>
                </div>
                <div class="decision fragment">
                    <b style="color:var(--gold)">DECISIÓN 2:</b> ¿Aprobamos este formato como el oficial para 2026?
                </div>
            </section>

            <section>
                <h2>3. Prioridades "Sagradas"</h2>
                <p>Para asegurar la <b>Fundación 2026</b>, blindamos estos 3 frentes:</p>
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:20px;">
                    <div class="card">💰 <b>FINANZAS</b><br><span style="font-size:0.7em">Caja 13 Semanas</span></div>
                    <div class="card">⚙️ <b>OPS</b><br><span style="font-size:0.7em">Estándar HSEC</span></div>
                    <div class="card">👥 <b>TALENTO</b><br><span style="font-size:0.7em">Dir. Comercial</span></div>
                </div>
                <div class="fragment fade-up" style="margin-top:20px;">
                    <img src="chart_vision.svg" class="chart" style="height:150px;">
                </div>
            </section>

            <section>
                <h2>4. El Mandato</h2>
                <div class="grid-2">
                    <div class="card">
                        <h4 style="color:var(--accent)">Rol Consultor (Yo)</h4>
                        <ul style="font-size:0.7em; text-align:left;">
                            <li>Instalar la PMO liviana.</li>
                            <li>Perseguir entregables.</li>
                            <li>Levantar alertas rojas.</li>
                        </ul>
                    </div>
                    <div class="card">
                        <h4 style="color:var(--accent)">Rol Gerente General</h4>
                        <ul style="font-size:0.7em; text-align:left;">
                            <li>Validar a los Responsables.</li>
                            <li>Exigir el formato estándar.</li>
                            <li>Liderar comité mensual.</li>
                        </ul>
                    </div>
                </div>
                <div class="decision fragment" style="text-align:center;">
                    <b style="color:var(--gold); font-size:1.2em">DECISIÓN FINAL:</b><br>
                    "¿Tengo luz verde para instalar este sistema el lunes?"
                </div>
            </section>

        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js"></script>
    <script>Reveal.initialize({ hash: true, transition: 'convex', backgroundTransition: 'zoom' });</script>
</body>
</html>
"""

# ==========================================
# 3. EJECUCIÓN
# ==========================================
if __name__ == "__main__":
    # 1. Generar SVGs
    generar_todos_los_graficos()
    
    # 2. Generar HTML
    filename = "Presentacion_Final_Casia.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_template)
    
    # 3. Abrir
    print(f"¡Listo Victor! Todo generado. Abriendo {filename}...")
    webbrowser.open('file://' + os.path.realpath(filename))