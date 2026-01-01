import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Map crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h3 className="font-display text-lg font-bold text-foreground">
              {this.props.title ?? "Mapa indisponível"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.props.description ??
                "O mapa falhou ao carregar neste dispositivo/ambiente. Os demais dados seguem disponíveis."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button size="sm" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: undefined })}
              >
                Tentar novamente
              </Button>
            </div>
            {this.state.error?.message && (
              <div className="mt-4 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
