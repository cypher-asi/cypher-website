export interface PageSection {
  id: string;
  label: string;
}

export const pageSections: Record<string, PageSection[]> = {
  '/vision': [
    { id: 'hero', label: 'Overview' },
    { id: 'principles', label: 'Principles' },
    { id: 'statement', label: 'Statement' },
  ],
  '/zero': [
    { id: 'hero', label: 'Overview' },
    { id: 'principles', label: 'Principles' },
    { id: 'features', label: 'Features' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'trust', label: 'Security' },
    { id: 'open', label: 'Open Source' },
    { id: 'start', label: 'Get Started' },
    { id: 'faq', label: 'FAQ' },
  ],
  '/zode': [
    { id: 'hero', label: 'Overview' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'features', label: 'Features' },
    { id: 'security', label: 'Security' },
    { id: 'start', label: 'Get Started' },
    { id: 'faq', label: 'FAQ' },
  ],
};
