import { useState, type FormEvent } from 'react';
import { ChatView } from './components/ChatView';
import { useTrip } from './hooks/useTrip';

export default function App() {
  const { days, now, loading, error, updatedAt, needKey, refresh, submitKey } = useTrip();

  if (needKey) return <KeyForm loading={loading} error={error} onSubmit={submitKey} />;

  if (!days.length) {
    return (
      <main className="mx-auto flex h-dvh max-w-[440px] flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="font-display text-3xl font-bold">TourLang</h1>
        {loading ? (
          <p className="text-muted">Mengambil jadwal…</p>
        ) : (
          <>
            <p className="text-muted">{error ?? 'Belum ada kegiatan di tab rundown.'}</p>
            <button type="button" onClick={refresh} className="h-12 cursor-pointer rounded-2xl bg-ink px-6 font-bold text-white">
              Coba lagi
            </button>
          </>
        )}
      </main>
    );
  }

  return <ChatView days={days} now={now} updatedAt={updatedAt} error={error} loading={loading} onRefresh={refresh} />;
}

/** Form kode akses. Kode disimpan di HP ini saja, tidak ikut di file app. */
function KeyForm({ loading, error, onSubmit }: { loading: boolean; error: string | null; onSubmit: (key: string) => void }) {
  const [key, setKey] = useState('');
  const wrong = error === 'Kunci akses salah';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (key.trim()) onSubmit(key);
  };

  return (
    <main className="mx-auto flex h-dvh max-w-[440px] flex-col items-center justify-center px-6">
      <form onSubmit={submit} className="flex w-full flex-col gap-4 rounded-3xl bg-paper p-6 shadow-card">
        <h1 className="font-display text-3xl font-bold">TourLang</h1>
        <label htmlFor="kode" className="text-muted">
          Masukkan kode akses dari Abraham. Cukup sekali di HP ini.
        </label>
        <input
          id="kode"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="h-12 rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-ink"
        />
        {wrong && <p className="text-sm font-bold text-accent">Kode salah, coba lagi.</p>}
        {error && !wrong && error !== 'Masukkan kode akses' && <p className="text-sm text-muted">{error}</p>}
        <button
          type="submit"
          disabled={loading || !key.trim()}
          className="h-12 cursor-pointer rounded-2xl bg-ink font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Memeriksa…' : 'Buka jadwal'}
        </button>
      </form>
    </main>
  );
}
