import React, { type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 border border-red-900/40 rounded-2xl bg-zinc-900/60 text-center min-h-[300px]">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200">渲染出错</p>
            <p className="text-xs text-zinc-500 font-mono max-w-md break-all">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs text-zinc-300 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
