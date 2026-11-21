import { Component, type ReactNode } from "react";

/**
 * Keeps one page's render error from blanking the whole app (React unmounts the root on an
 * uncaught error). Shows a calm retry instead; resets when the route changes.
 */
export class PageBoundary extends Component<{ children: ReactNode; page: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[page]", this.props.page, error);
  }
  componentDidUpdate(prev: { page: string }) {
    if (prev.page !== this.props.page && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page page-error" role="alert">
        <p className="eyebrow">出了点小状况</p>
        <h1 className="display">这一页没能显示出来</h1>
        <p className="lede">你的学习进度和设置都还在。可以先重试这一页；如果还不行，再刷新整个应用。</p>
        <p className="muted">{this.state.error.message}</p>
        <div className="about-actions">
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            重试
          </button>
          <button className="btn btn-ghost" onClick={() => location.reload()}>
            刷新应用
          </button>
        </div>
      </div>
    );
  }
}
