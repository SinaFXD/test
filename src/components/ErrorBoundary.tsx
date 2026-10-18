import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/** Contain a failing section (e.g. a chart) so the rest of the app keeps working. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(err: unknown) {
    console.error(err);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
