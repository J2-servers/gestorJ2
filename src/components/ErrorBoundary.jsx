import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-auth-loading">
        <div className="app-error-card" role="alert">
          <div className="app-error-icon">
            <AlertTriangle size={24} />
          </div>
          <strong>Algo saiu do eixo</strong>
          <span>
            A tela encontrou um erro inesperado. Recarregue para continuar sem perder a sessao.
          </span>
          <button onClick={() => window.location.reload()} type="button">
            <RefreshCw size={16} />
            Recarregar sistema
          </button>
        </div>
      </div>
    );
  }
}
