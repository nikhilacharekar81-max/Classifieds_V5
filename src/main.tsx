import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import type { AppClientRouterProps } from '@/components/AppClientRouter';

function getInitialSsrProps(): AppClientRouterProps | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.getElementById('__SSR_STATE__');
  if (!el || !el.textContent) return undefined;
  try {
    return JSON.parse(el.textContent) as AppClientRouterProps;
  } catch (err) {
    console.warn('Failed to parse __SSR_STATE__:', err);
    return undefined;
  }
}

const ssrProps = getInitialSsrProps();
const container = document.getElementById('root')!;
createRoot(container).render(<App ssrProps={ssrProps} />);
