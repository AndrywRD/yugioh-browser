export default function MatchLoading() {
  return (
    <main className="fm-screen fm-noise-overlay flex h-screen min-h-screen w-full items-center justify-center p-4">
      <section className="fm-panel w-full max-w-md rounded-xl p-6 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-amber-300/85 border-t-transparent" />
        <h1 className="fm-title mt-4 text-base font-bold">Carregando Duelo</h1>
        <p className="mt-1 text-sm text-slate-300">Preparando campo, deck e conexao da sala...</p>
      </section>
    </main>
  );
}
