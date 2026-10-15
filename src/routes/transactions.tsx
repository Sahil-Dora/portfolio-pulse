import { createFileRoute } from '@tanstack/react-router';
import { WorkspacePage } from '@/components/pulse/workspace-page';
export const Route = createFileRoute('/transactions')({
  head: () => ({ meta: [
    { title: 'Transactions | Portfolio Pulse' },
    { name: 'description', content: 'Your investment activity and transaction history.' },
    { property: 'og:title', content: 'Transactions | Portfolio Pulse' },
    { property: 'og:description', content: 'Your investment activity and transaction history.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <WorkspacePage section="transactions" />; }
