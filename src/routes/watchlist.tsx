import { createFileRoute } from '@tanstack/react-router';
import { WorkspacePage } from '@/components/pulse/workspace-page';
export const Route = createFileRoute('/watchlist')({
  head: () => ({ meta: [
    { title: 'Watchlist | Portfolio Pulse' },
    { name: 'description', content: 'Follow the stocks and cryptocurrencies on your radar.' },
    { property: 'og:title', content: 'Watchlist | Portfolio Pulse' },
    { property: 'og:description', content: 'Follow the stocks and cryptocurrencies on your radar.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <WorkspacePage section="watchlist" />; }
