//app/ecosistema/page.tsx
import EcosystemGraph from '@/components/EcosystemGraph'; // Asegúrate que la ruta sea correcta

export default function EcosystemPage() {
  return (
    <main className="w-full h-screen bg-gray-900">
      <EcosystemGraph />
    </main>
  );
}