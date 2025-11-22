import React from 'react';
import { SomethingWentWrong } from '../pages/ErrorPages/ErrorPages';

interface ErrorBoundaryState { hasError: boolean; error?: any; info?: any; }

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught runtime error', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return <SomethingWentWrong />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
