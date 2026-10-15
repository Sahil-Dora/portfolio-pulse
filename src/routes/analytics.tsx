import { createFileRoute } from '@tanstack/react-router';
import { WorkspacePage } from '@/components/pulse/workspace-page';
export const Route = createFileRoute('/analytics')({
  head: () => ({ meta: [
    { title: 'Analytics | Portfolio Pulse' },
    { name: 'description', content: 'A deeper view of your investment performance.' },
    { property: 'og:title', content: 'Analytics | Portfolio Pulse' },
    { property: 'og:description', content: 'A deeper view of your investment performance.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <WorkspacePage section="analytics" />; }
