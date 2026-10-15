import { createFileRoute } from '@tanstack/react-router';
import { WorkspacePage } from '@/components/pulse/workspace-page';
export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [
    { title: 'Settings | Portfolio Pulse' },
    { name: 'description', content: 'Your Portfolio Pulse account and workspace preferences.' },
    { property: 'og:title', content: 'Settings | Portfolio Pulse' },
    { property: 'og:description', content: 'Your Portfolio Pulse account and workspace preferences.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <WorkspacePage section="settings" />; }
