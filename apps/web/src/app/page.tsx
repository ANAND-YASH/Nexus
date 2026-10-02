import { getApiHealth } from '@/lib/api';

export default async function HomePage() {
  const health = await getApiHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">NEXUS</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Personal Context &amp; Action Engine
      </p>
      <p className="text-sm">
        API status:{' '}
        <span
          className={
            health?.status === 'ok' ? 'text-green-600' : 'text-red-600'
          }
        >
          {health?.status === 'ok' ? 'online' : 'unreachable'}
        </span>
      </p>
    </main>
  );
}
