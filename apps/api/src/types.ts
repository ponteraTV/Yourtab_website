export interface SiteSettings { siteName: string; logoUrl: string; tagline: string; primaryColor: string; accentColor: string; footerText: string; }
export interface HomepageSection { id: 'hero' | 'featured' | 'trending'; title: string; eyebrow: string; headline: string; description: string; ctaLabel: string; ctaUrl: string; enabled: boolean; imageUrl: string; }
export interface Banner { id: string; title: string; message: string; ctaLabel: string; ctaUrl: string; enabled: boolean; tone: 'dark' | 'light' | 'accent'; }
export interface CustomPage { id: string; title: string; slug: string; excerpt: string; content: string; published: boolean; updatedAt: string; }
export interface CmsData { settings: SiteSettings; homepageSections: HomepageSection[]; banners: Banner[]; pages: CustomPage[]; }
