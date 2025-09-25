import React from 'react';

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
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2 style={{ marginTop:0 }}>Something went wrong.</h2>
          <p style={{ opacity:.75, maxWidth:560 }}>A runtime error occurred. Try refreshing. If it keeps happening, capture the console log and report it.</p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{ background:'#1e293b', color:'#f8fafc', padding:'1rem', borderRadius:8, overflow:'auto', maxHeight:240 }}>
{String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
          <button onClick={()=> window.location.reload()} style={{ marginTop:12, padding:'8px 16px', borderRadius:6, border:'1px solid #334155', background:'#0ea5e9', color:'#fff', fontWeight:600, cursor:'pointer' }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
