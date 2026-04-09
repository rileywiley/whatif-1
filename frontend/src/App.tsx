import { Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RaceSelector } from './pages/RaceSelector';
import { RaceTimeline } from './pages/RaceTimeline';
import { ResultsComparison } from './pages/ResultsComparison';
import { LapReplay } from './pages/LapReplay';
import { ShareView } from './pages/ShareView';
import { Tutorial } from './pages/Tutorial';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#E24B4A', fontFamily: 'monospace', background: '#0C0C0E', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#E8E6E1' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#8A8A8E', marginTop: 8 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RaceSelector />} />
            <Route path="/race/:raceId" element={<RaceTimeline />} />
            <Route path="/race/:raceId/results" element={<ResultsComparison />} />
            <Route path="/race/:raceId/replay" element={<LapReplay />} />
            <Route path="/scenario/:scenarioId" element={<ShareView />} />
            <Route path="/tutorial" element={<Tutorial />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
