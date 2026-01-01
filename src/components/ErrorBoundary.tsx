import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background text-foreground">
          <section className="container mx-auto px-6 py-16 max-w-2xl">
            <h1 className="font-display text-3xl font-bold">Ocorreu um erro</h1>
            <p className="mt-3 text-muted-foreground">
              A página encontrou um problema ao carregar. Tente recarregar. Se o erro persistir,
              me avise qual rota você estava acessando.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => window.location.reload()}>Recarregar</Button>
              <Button variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })}>
                Tentar novamente
              </Button>
            </div>
            {this.state.error?.message && (
              <pre className="mt-6 whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
