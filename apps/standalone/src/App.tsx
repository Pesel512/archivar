import type { JSX } from 'react';
import { useHashRoute } from './router';
import { StartView } from './routes/StartView';
import { CalibrateView } from './routes/CalibrateView';
import { DebugView } from './routes/DebugView';

export function App(): JSX.Element {
  const route = useHashRoute();

  switch (route) {
    case '/calibrate':
      return <CalibrateView />;
    case '/debug':
      return <DebugView />;
    default:
      return <StartView />;
  }
}
