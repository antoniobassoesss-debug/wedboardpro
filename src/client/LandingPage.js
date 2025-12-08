import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing-page.css';
const PRIMARY_CTA_HREF = '/signup';
const DEMO_HREF = '/demo';
const LandingPage = () => {
    useEffect(() => {
        // Enable scrolling on landing page
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById('root');
        const originalHtmlOverflow = html.style.overflow;
        const originalBodyOverflow = body.style.overflow;
        const originalBodyHeight = body.style.height;
        const originalRootPosition = root?.style.position;
        const originalRootOverflow = root?.style.overflow;
        const originalRootHeight = root?.style.height;
        html.style.overflow = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        if (root) {
            root.style.position = 'relative';
            root.style.overflow = 'visible';
            root.style.height = 'auto';
        }
        return () => {
            // Restore original styles when component unmounts
            html.style.overflow = originalHtmlOverflow;
            body.style.overflow = originalBodyOverflow;
            body.style.height = originalBodyHeight;
            if (root) {
                root.style.position = originalRootPosition || '';
                root.style.overflow = originalRootOverflow || '';
                root.style.height = originalRootHeight || '';
            }
        };
    }, []);
    return (_jsxs("div", { className: "landing-shell", children: [_jsx(LandingHeader, {}), _jsxs("main", { className: "landing-main", children: [_jsx(HeroSection, {}), _jsx(SocialProofStrip, {}), _jsx(FeatureGrid, {}), _jsx(WorkflowSection, {}), _jsx(ScreenshotsSection, {}), _jsx(TestimonialsSection, {}), _jsx(PricingTeaser, {}), _jsx(FAQSection, {}), _jsx(FinalCTA, {})] }), _jsx(LandingFooter, {})] }));
};
export default LandingPage;
/* ----------------------------- Header / Nav ----------------------------- */
const LandingHeader = () => {
    return (_jsx("header", { className: "landing-header", children: _jsxs("div", { className: "landing-header-inner", children: [_jsxs(Link, { to: "/", className: "landing-logo", children: [_jsx("img", { src: "/logo/iconlogo.png", alt: "WedBoardPro", className: "landing-logo-mark" }), _jsx("span", { className: "landing-logo-text", children: "WedBoardPro" })] }), _jsxs("nav", { className: "landing-nav", children: [_jsx("a", { href: "#product", children: "Product" }), _jsx("a", { href: "#pricing", children: "Pricing" }), _jsx("a", { href: "#for-planners", children: "For planners" }), _jsx(Link, { to: "/login", className: "landing-nav-login", children: "Login" })] }), _jsx("div", { className: "landing-header-cta", children: _jsx(Link, { to: PRIMARY_CTA_HREF, className: "landing-btn-primary", children: "Start Free Trial" }) })] }) }));
};
/* ------------------------------ Hero Section ---------------------------- */
const HeroSection = () => {
    return (_jsx("section", { id: "for-planners", className: "landing-section", children: _jsxs("div", { className: "landing-hero", children: [_jsxs("div", { className: "landing-hero-left", children: [_jsx("p", { className: "landing-eyebrow", children: "For professional wedding planners" }), _jsx("h1", { className: "landing-hero-title", children: "Run every wedding from one beautiful workspace." }), _jsx("p", { className: "landing-hero-subtitle", children: "WedBoardPro centralizes your timelines, tasks, quotes, vendors and team so every event feels calm and every client feels taken care of." }), _jsxs("div", { className: "landing-hero-buttons", children: [_jsx(Link, { to: PRIMARY_CTA_HREF, className: "landing-btn-primary", children: "Start Free Trial" }), _jsxs(Link, { to: DEMO_HREF, className: "landing-btn-ghost", children: [_jsx("span", { className: "play", children: "\u25B6" }), _jsx("span", { children: "Watch 2\u2011min tour" })] })] }), _jsxs("div", { className: "landing-hero-microgrid", children: [_jsx(MicroBenefit, { title: "See every event at a glance", description: "One pipeline for all weddings with stages, budgets and due dates." }), _jsx(MicroBenefit, { title: "Send polished quotes in minutes", description: "Use reusable templates instead of rebuilding proposals from scratch." }), _jsx(MicroBenefit, { title: "Keep team & vendors in sync", description: "Share timelines, tasks and notes so everyone knows what\u2019s next." })] })] }), _jsx("div", { className: "landing-hero-right", children: _jsxs("div", { className: "landing-mock-card", children: [_jsx("div", { className: "landing-mock-glow" }), _jsxs("div", { className: "landing-mock-inner", children: [_jsxs("div", { className: "landing-mock-header", children: [_jsxs("div", { className: "landing-mock-dots", children: [_jsx("span", { className: "landing-mock-dot" }), _jsx("span", { className: "landing-mock-dot" }), _jsx("span", { className: "landing-mock-dot" })] }), _jsx("span", { children: "Jo\u00E3o & Marta \u2013 20/09/2026" })] }), _jsxs("div", { className: "landing-mock-body", children: [_jsxs("div", { className: "landing-mock-sidebar", children: [_jsx("p", { className: "landing-mock-sidebar-title", children: "Events" }), ['Lisbon rooftop', 'Country estate', 'Beach ceremony'].map((name, idx) => (_jsxs("div", { className: 'landing-mock-event' + (idx === 0 ? ' main' : ''), children: [_jsx("p", { className: "landing-mock-event-title", children: name }), _jsxs("p", { className: "landing-mock-event-sub", children: ["Sept ", 20 + idx, ", 2026 \u00B7 ", idx === 0 ? 'On track' : 'Planning'] })] }, name)))] }), _jsxs("div", { className: "landing-mock-stages", children: [_jsxs("div", { className: "landing-mock-header", style: { marginBottom: 4 }, children: [_jsx("span", { className: "landing-mock-sidebar-title", children: "Project pipeline" }), _jsx("span", { className: "landing-mock-pill", children: "72% on track" })] }), [
                                                        { label: 'Vision & style', progress: 100 },
                                                        { label: 'Venue & date', progress: 80 },
                                                        { label: 'Vendors & contracts', progress: 60 },
                                                        { label: 'Logistics & timeline', progress: 30 },
                                                    ].map((stage) => (_jsxs("div", { className: "landing-mock-stage", children: [_jsxs("div", { children: [_jsx("p", { className: "landing-mock-stage-title", children: stage.label }), _jsx("p", { className: "landing-mock-stage-sub", children: stage.progress === 100 ? 'Completed' : `${stage.progress}% in progress` })] }), _jsx("div", { className: "landing-mock-progress", children: _jsx("div", { className: "landing-mock-progress-bar", style: { width: `${Math.max(18, stage.progress)}%` } }) })] }, stage.label)))] })] })] })] }) })] }) }));
};
const MicroBenefit = ({ title, description }) => (_jsxs("div", { className: "landing-microcard", children: [_jsx("div", { className: "landing-micro-icon", children: "\u2713" }), _jsxs("div", { children: [_jsx("div", { className: "landing-micro-title", children: title }), _jsx("div", { className: "landing-micro-text", children: description })] })] }));
/* --------------------------- Social Proof Strip ------------------------- */
const SocialProofStrip = () => {
    return (_jsx("section", { className: "landing-section", children: _jsxs("div", { className: "landing-strip", children: [_jsxs("div", { children: [_jsx("strong", { children: "Trusted by wedding planners across Europe." }), ' ', _jsx("span", { children: "\u2605 4.9 / 5 average satisfaction" })] }), _jsx("div", { className: "landing-strip-logos", children: ['Lisbon & Co.', 'Amalfi Events', 'Nordic Weddings', 'Sunset Venues'].map((name) => (_jsx("div", { className: "landing-strip-logo", children: name }, name))) })] }) }));
};
/* ------------------------ Key Outcomes / Features ----------------------- */
const FeatureGrid = () => {
    const items = [
        {
            title: 'Project Pipeline',
            description: 'Track each wedding from first brief to post‑event follow‑up in one timeline.',
        },
        {
            title: 'Quote Maker',
            description: 'Generate beautiful, accurate proposals in minutes using your own templates.',
        },
        {
            title: 'Smart Calendar',
            description: 'See all event dates, tasks and team workload in a single, color‑coded view.',
        },
    ];
    return (_jsxs("section", { id: "product", className: "landing-section", children: [_jsxs("div", { className: "landing-section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Designed for real planners" }), _jsx("h2", { className: "landing-section-title", children: "Less chaos. More calm, profitable weddings." })] }), _jsx("p", { className: "landing-section-subtitle", children: "WedBoardPro replaces scattered spreadsheets, WhatsApp threads and paper notebooks with a single workspace the whole team can rely on." })] }), _jsx("div", { className: "landing-grid-3", children: items.map((item) => (_jsxs("article", { className: "landing-card", children: [_jsx("div", { className: "landing-card-kicker", children: item.title[0] }), _jsx("h3", { className: "landing-card-title", children: item.title }), _jsx("p", { className: "landing-card-text", children: item.description })] }, item.title))) })] }));
};
/* --------------------------- Workflow Section --------------------------- */
const WorkflowSection = () => {
    const steps = [
        {
            title: 'Plan the event',
            description: 'Create a project, define stages and tasks, and connect budgets, vendors and documents.',
            detail: 'Stage cards, task checklists and client details in one project.',
        },
        {
            title: 'Share the details',
            description: 'Send quotes, timelines and checklists with a single link so clients and vendors stay aligned.',
            detail: 'Share timelines, PDFs and vendor info with branded, read‑only views.',
        },
        {
            title: 'Deliver the day',
            description: 'Use a clear day‑of view with timings, owners and notes to run the wedding calmly.',
            detail: 'Switch to a focused, hour‑by‑hour view the team can follow on the day.',
        },
    ];
    return (_jsxs("section", { className: "landing-section", children: [_jsxs("div", { className: "landing-section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Workflow" }), _jsx("h2", { className: "landing-section-title", children: "A simple flow from enquiry to sparkler exit." })] }), _jsx("p", { className: "landing-section-subtitle", children: "Every wedding follows the same backbone: plan, share, deliver. WedBoardPro keeps each step organised so nothing slips through the cracks." })] }), _jsx("ol", { className: "landing-workflow-grid", children: steps.map((step, index) => (_jsxs("li", { className: "landing-card", children: [_jsx("div", { className: "landing-workflow-step-number", children: index + 1 }), _jsx("h3", { className: "landing-card-title", children: step.title }), _jsx("p", { className: "landing-card-text", children: step.description }), _jsx("div", { className: "landing-workflow-pill", children: step.detail })] }, step.title))) })] }));
};
/* ------------------------- Deep Product Sections ------------------------ */
const ScreenshotsSection = () => {
    return (_jsxs("section", { className: "landing-section", children: [_jsxs("div", { className: "landing-two-col", children: [_jsx(MockPipelineCard, {}), _jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Project Pipeline" }), _jsx("h3", { className: "landing-section-title", children: "See every wedding\u2019s status in a single, live board." }), _jsx("p", { className: "landing-section-subtitle", children: "Each event has clear stages from \u201CVision & Style\u201D to \u201CPost\u2011event follow\u2011up\u201D. Tasks, documents and budgets live inside the same view so you never wonder what\u2019s next." }), _jsxs("ul", { className: "landing-card-text", style: { marginTop: 12, listStyle: 'disc', paddingLeft: 18 }, children: [_jsx("li", { children: "Spot risky events early with overdue stages and blocked tasks." }), _jsx("li", { children: "Keep your team aligned with shared checklists and owners per stage." }), _jsx("li", { children: "Scroll back through the activity log to see who changed what, and when." })] })] })] }), _jsxs("div", { className: "landing-two-col", style: { marginTop: 40 }, children: [_jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Quote Maker & Budget" }), _jsx("h3", { className: "landing-section-title", children: "Professional proposals that clients approve faster." }), _jsx("p", { className: "landing-section-subtitle", children: "Build line\u2011item quotes from your own services library, apply markups and taxes, and keep budget vs. actuals in sync automatically as you book vendors." }), _jsxs("ul", { className: "landing-card-text", style: { marginTop: 12, listStyle: 'disc', paddingLeft: 18 }, children: [_jsx("li", { children: "Reuse templates instead of rebuilding every proposal from a blank file." }), _jsx("li", { children: "Keep deposits, instalments and final payments under control." }), _jsx("li", { children: "Export branded PDFs or share a secure link clients can sign off on." })] })] }), _jsx(MockQuotesCard, {})] })] }));
};
const MockPipelineCard = () => {
    return (_jsxs("div", { className: "landing-card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsx("span", { className: "landing-card-text", style: { fontSize: 11 }, children: "Project Pipeline" }), _jsx("span", { className: "landing-badge", style: { backgroundColor: 'rgba(15,23,42,0.05)', color: '#0f172a' }, children: "8 active weddings" })] }), _jsx("div", { className: "landing-grid-3", style: { gap: 10 }, children: ['Planning', 'In progress', 'Ready'].map((column, colIdx) => (_jsxs("div", { style: { background: '#f8fafc', borderRadius: 16, padding: 10 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 600 }, children: column }), _jsxs("span", { style: { fontSize: 10, color: '#94a3b8' }, children: [2 + colIdx, " events"] })] }), [1, 2].map((i) => (_jsxs("div", { style: {
                                borderRadius: 14,
                                border: '1px solid rgba(148,163,184,0.5)',
                                padding: '6px 8px',
                                background: '#ffffff',
                                marginBottom: 6,
                            }, children: [_jsxs("div", { style: { fontSize: 11, fontWeight: 500 }, children: ["Lisbon rooftop \u00B7 ", 2026 + i] }), _jsxs("div", { style: { fontSize: 10, color: '#6b7280' }, children: ["Stage ", colIdx + 1, " of 4 \u00B7 6 tasks"] })] }, i)))] }, column))) })] }));
};
const MockQuotesCard = () => {
    return (_jsxs("div", { className: "landing-card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsx("span", { className: "landing-card-text", style: { fontSize: 11 }, children: "Quote Maker" }), _jsx("span", { className: "landing-badge", children: "Draft \u00B7 \u20AC18 400" })] }), _jsxs("div", { className: "landing-two-col", style: { gap: 12, gridTemplateColumns: '2fr 1fr' }, children: [_jsx("div", { style: { background: '#f8fafc', borderRadius: 16, padding: 10 }, children: ['Venue fee', 'Catering', 'Photography', 'Flowers & decor'].map((item, idx) => (_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderRadius: 12,
                                border: '1px solid rgba(148,163,184,0.5)',
                                padding: '6px 8px',
                                background: '#ffffff',
                                marginBottom: 6,
                                fontSize: 11,
                            }, children: [_jsx("span", { children: item }), _jsxs("span", { style: { color: '#64748b', fontSize: 10 }, children: ["\u20AC ", idx === 0 ? '4 500' : idx === 1 ? '7 800' : idx === 2 ? '2 400' : '3 700'] })] }, item))) }), _jsxs("div", { style: { background: '#f8fafc', borderRadius: 16, padding: 10, fontSize: 11 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#64748b' }, children: [_jsx("span", { children: "Subtotal" }), _jsx("span", { children: "\u20AC 18 400" })] }), _jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    color: '#64748b',
                                    marginTop: 4,
                                }, children: [_jsx("span", { children: "Tax (23%)" }), _jsx("span", { children: "Included" })] }), _jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: 8,
                                    borderTop: '1px solid rgba(148,163,184,0.5)',
                                    paddingTop: 6,
                                    fontWeight: 600,
                                }, children: [_jsx("span", { children: "Total" }), _jsx("span", { children: "\u20AC 18 400" })] }), _jsx("div", { style: {
                                    marginTop: 8,
                                    borderRadius: 12,
                                    border: '1px dashed rgba(16,185,129,0.8)',
                                    background: '#ecfdf5',
                                    padding: '6px 8px',
                                    fontSize: 10,
                                    color: '#166534',
                                }, children: "Client sees this with your logo and can approve in one click." })] })] })] }));
};
/* -------------------------- Testimonials Section ------------------------ */
const TestimonialsSection = () => {
    const testimonials = [
        {
            name: 'Carolina Alves',
            role: 'Destination wedding planner, Lisbon',
            quote: 'WedBoardPro finally gave us one place for tasks, vendors and budgets. My team knows exactly what to do every day.',
            badge: '+10 hours saved per event',
        },
        {
            name: 'Marko & Elena',
            role: 'Boutique planning studio, Croatia',
            quote: 'Before, we were drowning in spreadsheets. Now every event has a clear pipeline and our couples feel the difference.',
            badge: 'Fewer last‑minute surprises',
        },
        {
            name: 'Sofia Mendes',
            role: 'Solo planner, Porto',
            quote: 'I run 15+ weddings a year on my own. WedBoardPro keeps me calm, even on triple‑header weekends.',
            badge: 'Single source of truth',
        },
    ];
    return (_jsxs("section", { className: "landing-section", children: [_jsx("div", { className: "landing-section-header", children: _jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Social proof" }), _jsx("h2", { className: "landing-section-title", children: "Planners who live inside WedBoardPro." })] }) }), _jsx("div", { className: "landing-testimonials-grid", children: testimonials.map((t) => (_jsxs("figure", { className: "landing-testimonial", children: [_jsxs("blockquote", { className: "landing-testimonial-quote", children: ["\u201C", t.quote, "\u201D"] }), _jsxs("figcaption", { className: "landing-testimonial-footer", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { className: "landing-avatar", children: t.name
                                                .split(' ')
                                                .map((s) => s[0])
                                                .slice(0, 2)
                                                .join('') }), _jsxs("div", { children: [_jsx("div", { className: "landing-testimonial-name", children: t.name }), _jsx("div", { className: "landing-testimonial-role", children: t.role })] })] }), _jsx("span", { className: "landing-badge", children: t.badge })] })] }, t.name))) })] }));
};
/* ---------------------------- Pricing Teaser ----------------------------- */
const PricingTeaser = () => {
    const inclusions = [
        'Unlimited active events',
        'Project Pipeline & Smart Calendar',
        'Quote Maker & basic budgets',
        'Team collaboration for small studios',
        'Email support from real planners',
    ];
    return (_jsxs("section", { id: "pricing", className: "landing-section", children: [_jsxs("div", { className: "landing-section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "Pricing" }), _jsx("h2", { className: "landing-section-title", children: "Simple pricing for serious planners." })] }), _jsx("p", { className: "landing-section-subtitle", children: "Start with a free trial. Upgrade only when you are ready to run your whole studio on WedBoardPro." })] }), _jsxs("div", { className: "landing-card landing-pricing-card", children: [_jsx("h3", { className: "landing-card-title", children: "For Professional Planners" }), _jsx("p", { className: "landing-card-text", children: "For solo planners and boutique agencies running multiple weddings each season." }), _jsxs("div", { style: { marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4 }, children: [_jsx("span", { style: { fontSize: 24, fontWeight: 600 }, children: "From \u20ACXX" }), _jsx("span", { style: { fontSize: 12, color: '#64748b' }, children: "/month" })] }), _jsx("ul", { style: {
                            marginTop: 14,
                            fontSize: 12,
                            color: '#475569',
                            listStyle: 'none',
                            paddingLeft: 0,
                        }, children: inclusions.map((item) => (_jsxs("li", { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }, children: [_jsx("span", { style: {
                                        width: 10,
                                        height: 10,
                                        borderRadius: '999px',
                                        background: '#38bdf8',
                                        marginTop: 3,
                                    } }), _jsx("span", { children: item })] }, item))) }), _jsxs("div", { style: { marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }, children: [_jsx(Link, { to: PRIMARY_CTA_HREF, className: "landing-btn-primary", style: { flex: 1 }, children: "Start Free Trial" }), _jsx(Link, { to: "/pricing", className: "landing-btn-ghost", style: { flex: 1, justifyContent: 'center' }, children: "View full pricing" })] })] })] }));
};
/* ------------------------------- FAQ Section ----------------------------- */
const FAQ_ITEMS = [
    {
        question: 'Is WedBoardPro only for agencies?',
        answer: 'No. We designed the workspace for both solo planners and small teams. You can start alone and add team members later.',
    },
    {
        question: 'Do I need to install anything?',
        answer: 'No installation required. WedBoardPro runs in the browser and works on desktop, tablet and mobile.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes. You can cancel your subscription at any time from your account settings. No long‑term contracts.',
    },
    {
        question: 'Do you support multiple planners per account?',
        answer: 'Yes. Invite planners to your team, assign them to events and tasks, and control access to budgets.',
    },
    {
        question: 'What happens at the end of the trial?',
        answer: "We'll remind you before your trial ends. You can choose a paid plan or export your data if you decide not to continue.",
    },
    {
        question: 'Is my client data secure?',
        answer: 'We use modern cloud infrastructure, encrypted connections and regular backups to keep your data safe.',
    },
];
const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState(0);
    return (_jsxs("section", { className: "landing-section", children: [_jsx("div", { className: "landing-section-header", children: _jsxs("div", { children: [_jsx("p", { className: "landing-section-eyebrow", children: "FAQ" }), _jsx("h2", { className: "landing-section-title", children: "Questions planners ask before switching." })] }) }), _jsx("div", { className: "landing-faq-grid", children: FAQ_ITEMS.map((item, index) => {
                    const isOpen = openIndex === index;
                    return (_jsxs("div", { className: "landing-faq-item", children: [_jsxs("button", { type: "button", onClick: () => setOpenIndex(isOpen ? null : index), className: "landing-faq-question-row", children: [_jsx("span", { className: "landing-faq-question", children: item.question }), _jsx("span", { className: "landing-faq-toggle", children: isOpen ? '−' : '+' })] }), isOpen && _jsx("p", { className: "landing-faq-answer", children: item.answer })] }, item.question));
                }) })] }));
};
/* ------------------------------ Final CTA ------------------------------- */
const FinalCTA = () => {
    return (_jsx("section", { className: "landing-section", children: _jsxs("div", { className: "landing-final", children: [_jsx("h2", { className: "landing-final-title", children: "Turn your wedding chaos into a calm, repeatable workflow." }), _jsx("p", { className: "landing-final-sub", children: "Start a free trial today or book a demo with our team of former planners." }), _jsxs("div", { className: "landing-final-buttons", children: [_jsx(Link, { to: PRIMARY_CTA_HREF, className: "landing-btn-primary", children: "Start Free Trial" }), _jsx(Link, { to: DEMO_HREF, className: "landing-btn-ghost", children: "Book a Demo" })] })] }) }));
};
/* -------------------------------- Footer -------------------------------- */
const LandingFooter = () => {
    return (_jsx("footer", { className: "landing-footer", children: _jsxs("div", { className: "landing-footer-inner", children: [_jsxs("p", { children: ["\u00A9 ", new Date().getFullYear(), " WedBoardPro. All rights reserved."] }), _jsxs("div", { className: "landing-footer-links", children: [_jsx(Link, { to: "/privacy", children: "Privacy" }), _jsx(Link, { to: "/terms", children: "Terms" }), _jsx(Link, { to: "/contact", children: "Contact" })] })] }) }));
};
//# sourceMappingURL=LandingPage.js.map