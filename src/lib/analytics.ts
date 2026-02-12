// Google Analytics 4 Tracking Utility for Blog
// Supports separate GA4 properties for main site and blog

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// GA4 Property IDs
const MAIN_SITE_GA_ID = 'G-X7PSZXCEK0';  // Main site property
const BLOG_GA_ID = 'G-RMFYLJS16S';       // Blog property

// Detect which property to use
const getGAProperty = (): string => {
  const hasWindow = typeof window !== 'undefined';
  const onBlog = hasWindow && window.location.pathname.startsWith('/blog');
  return onBlog ? BLOG_GA_ID : MAIN_SITE_GA_ID;
};

// Check if we're on a blog page
const isBlogPage = (): boolean => {
  const hasWindow = typeof window !== 'undefined';
  return hasWindow && window.location.pathname.startsWith('/blog');
};

// Initialize GA (already loaded in index.html)
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('GA initialized for:', getGAProperty());
  }
};

// Track a page view
export const trackPageView = (url: string, title: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const gaId = getGAProperty();
    
    if (isBlogPage()) {
      // Blog page - send to blog GA
      window.gtag('event', 'page_view', {
        page_path: url,
        page_title: title,
        send_to: gaId,
      });
    } else {
      // Main site - send to main GA
      window.gtag('event', 'page_view', {
        page_path: url,
        page_title: title,
      });
    }
    
    console.log('Page view tracked:', url, '->', gaId);
  }
};

// Track blog post view
export const trackBlogPostView = (postId: string, postTitle: string, category: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'blog_post_view', {
      event_category: 'blog',
      event_label: postTitle,
      post_id: postId,
      post_title: postTitle,
      post_category: category,
      send_to: BLOG_GA_ID,
      timestamp: new Date().toISOString(),
    });
  }
};

// Track article read completion
export const trackArticleRead = (postId: string, postTitle: string, readPercentage: number, timeSpent: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'article_read', {
      event_category: 'blog_engagement',
      event_label: postTitle,
      post_id: postId,
      read_percentage: readPercentage,
      time_spent_seconds: timeSpent,
      engagement_type: readPercentage >= 75 ? 'high' : readPercentage >= 50 ? 'medium' : 'low',
      send_to: BLOG_GA_ID,
    });
  }
};

// Track CTA clicks
export const trackCTAClick = (ctaLocation: string, ctaText: string, ctaType: string, linkUrl?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_click', {
      event_category: 'cta',
      event_label: ctaText,
      cta_location: ctaLocation,
      cta_type: ctaType,
      cta_url: linkUrl || '',
      send_to: isBlogPage() ? BLOG_GA_ID : MAIN_SITE_GA_ID,
    });
  }
};

// Track form submissions
export const trackLeadFormSubmission = (formType: string, formLocation: string, success: boolean) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'generate_lead', {
      event_category: 'form',
      event_label: formType,
      form_type: formType,
      form_location: formLocation,
      success: success,
      send_to: isBlogPage() ? BLOG_GA_ID : MAIN_SITE_GA_ID,
    });
  }
};

// Track internal link clicks
export const trackInternalLinkClick = (fromPost: string, toUrl: string, anchorText: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'internal_link_click', {
      event_category: 'navigation',
      event_label: anchorText,
      from_post: fromPost,
      to_url: toUrl,
      send_to: BLOG_GA_ID,
    });
  }
};

// Track social shares
export const trackSocialShare = (postTitle: string, platform: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'share', {
      event_category: 'social',
      event_label: platform,
      method: platform,
      content_type: 'blog_post',
      post_title: postTitle,
      send_to: BLOG_GA_ID,
    });
  }
};

// Track scroll depth
export const trackScrollDepth = (scrollPercentage: number, pageIdentifier: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const milestones = [25, 50, 75, 100];
    if (milestones.includes(scrollPercentage)) {
      window.gtag('event', 'scroll', {
        event_category: 'engagement',
        event_label: `${scrollPercentage}%`,
        scroll_depth: scrollPercentage,
        page_identifier: pageIdentifier,
        send_to: isBlogPage() ? BLOG_GA_ID : MAIN_SITE_GA_ID,
      });
    }
  }
};

// Track search
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      event_category: 'search',
      event_label: searchTerm,
      search_term: searchTerm,
      results_count: resultsCount,
      send_to: isBlogPage() ? BLOG_GA_ID : MAIN_SITE_GA_ID,
    });
  }
};

// Track outbound clicks
export const trackOutboundClick = (url: string, linkText: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'click', {
      event_category: 'outbound',
      event_label: linkText,
      outbound_url: url,
      send_to: MAIN_SITE_GA_ID,
    });
  }
};

// Custom timing event
export const trackTiming = (category: string, variable: string, value: number, label?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      event_category: category,
      name: variable,
      value: value,
      event_label: label || '',
      send_to: isBlogPage() ? BLOG_GA_ID : MAIN_SITE_GA_ID,
    });
  }
};

// Get GA client ID for server-side tracking
export const getGAClientId = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Try to get _ga cookie for blog property
    const gaCookies = document.cookie.split(';').find(c => c.trim().startsWith('_ga_'));
    return gaCookies || null;
  }
  return null;
};

export default {
  initGA,
  trackPageView,
  trackBlogPostView,
  trackArticleRead,
  trackCTAClick,
  trackLeadFormSubmission,
  trackInternalLinkClick,
  trackSocialShare,
  trackScrollDepth,
  trackSearch,
  trackOutboundClick,
  trackTiming,
  getGAClientId,
};
