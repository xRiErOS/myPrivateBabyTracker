/** Global error boundary — catches runtime errors and shows a friendly fallback. */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-peach" />
          <h2 className="font-headline text-lg font-semibold">Etwas ist schiefgelaufen</h2>
          <p className="font-body text-sm text-subtext0 max-w-md">
            {this.state.error?.message ?? "Unbekannter Fehler"}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
          >
            Zum Dashboard
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
