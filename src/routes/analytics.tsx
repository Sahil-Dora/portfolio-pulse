import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsPage } from '@/components/pulse/analytics-page';
export const Route = createFileRoute('/analytics')({
  head: () => ({ meta: [
    { title: 'Analytics | Portfolio Pulse' },
    { name: 'description', content: 'Asset allocation, average-cost gains and simulated drawdown for your Portfolio Pulse ledger.' },
    { property: 'og:title', content: 'Analytics | Portfolio Pulse' },
    { property: 'og:description', content: 'Asset allocation, average-cost gains and simulated drawdown for your Portfolio Pulse ledger.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AnalyticsPage,
});
