import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KeuanganKu render error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center p-4 [background:var(--gradient-bg)]">
        <div className="grid w-full max-w-[430px] gap-3 rounded-[34px] border border-line-strong bg-panel-strong/90 p-6 shadow-soft backdrop-blur-xl">
          <div className="grid size-12 place-items-center rounded-2xl text-xl font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)]">
            !
          </div>
          <h1 className="font-display text-2xl leading-tight tracking-tight text-ink">Terjadi kesalahan</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Aplikasi mengalami error tak terduga. Muat ulang halaman untuk melanjutkan. Jika masalah berulang, coba
            bersihkan cache browser atau hubungi pengelola.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/40 text-sm font-black text-on-accent shadow-accent transition hover:opacity-95 [background-image:var(--gradient-brand)]"
          >
            Muat Ulang Aplikasi
          </button>
          <details className="text-xs font-semibold text-muted-foreground">
            <summary>Detail teknis</summary>
            <p className="mt-2 break-words">{this.state.error?.message || String(this.state.error)}</p>
          </details>
        </div>
      </div>
    );
  }
}
