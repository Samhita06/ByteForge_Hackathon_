import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleDollarSign,
  Handshake,
  Lightbulb,
  Menu,
  Moon,
  Play,
  Sparkles,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '../app/theme-context.js';
import './LandingPage.css';

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About us', href: '#about' },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI Creator Copilot',
    description: 'Get grounded recommendations and practical next steps for your creator business.',
    detail: 'AI availability depends on your workspace configuration.',
    tone: 'violet',
  },
  {
    icon: CalendarDays,
    title: 'Content planner',
    description: 'Organize ideas and planned posts in a clear monthly calendar.',
    detail: 'Planning only. ByteForge does not publish posts.',
    tone: 'blue',
  },
  {
    icon: Handshake,
    title: 'Brand collaborations',
    description: 'Keep campaign details, agreed terms, deliverables, and deadlines together.',
    tone: 'pink',
  },
  {
    icon: BarChart3,
    title: 'Business dashboard',
    description: 'See key activity and financial totals from the records in your workspace.',
    detail: 'Totals reflect stored records; no currency conversion is applied.',
    tone: 'teal',
  },
  {
    icon: CircleDollarSign,
    title: 'Finance & invoices',
    description: 'Track income, expenses, invoices, and payment status in one place.',
    tone: 'amber',
  },
  {
    icon: Play,
    title: 'YouTube insights',
    description: 'Connect a YouTube account to review the channel statistics available to ByteForge.',
    detail: 'Read-only insights; connect an account to see its data.',
    tone: 'red',
  },
];

const solutions = [
  {
    icon: Lightbulb,
    title: 'Independent creators',
    description: 'Spend less time juggling campaign details and more time making work you care about.',
  },
  {
    icon: Users,
    title: 'Creator managers',
    description: 'Keep collaboration timelines, deliverables, and creator business records organized.',
  },
  {
    icon: Wallet,
    title: 'Growing creator businesses',
    description: 'Bring planning and financial tracking into one practical workspace as your work grows.',
  },
];

function ProductPreview() {
  return (
    <div className="public-preview-wrap" aria-label="Illustrative ByteForge workspace preview">
      <div className="public-preview-glow" />
      <div className="public-preview-window">
        <div className="public-preview-titlebar">
          <div className="public-window-dots"><i /><i /><i /></div>
          <span>byteforge / workspace</span>
          <span className="public-preview-live"><i /> YOUR WORKSPACE</span>
        </div>
        <div className="public-preview-body">
          <aside className="public-preview-sidebar">
            <div className="public-preview-logo"><Sparkles size={14} /></div>
            <i className="active" /><i /><i /><i /><i />
            <div className="public-preview-avatar">C</div>
          </aside>
          <div className="public-preview-content">
            <div className="public-preview-greeting">
              <div><small>MONDAY, YOUR CREATOR WORKSPACE</small><h2>Your work, in focus.</h2></div>
              <span className="public-preview-add"><span>+</span> New idea</span>
            </div>
            <div className="public-preview-metrics">
              <div><span>COLLABORATIONS</span><b><Handshake size={14} /> Campaigns</b><small>Keep brand work moving</small></div>
              <div><span>CONTENT PLANNER</span><b><CalendarDays size={14} /> Your calendar</b><small>Ideas and planned posts</small></div>
              <div><span>FINANCE</span><b><CircleDollarSign size={14} /> Income &amp; invoices</b><small>Records at a glance</small></div>
            </div>
            <div className="public-preview-lower">
              <div className="public-preview-calendar">
                <div className="public-preview-section-head"><div><b>Content plan</b><small>Plan what you want to create</small></div><CalendarDays size={15} /></div>
                <div className="public-calendar-grid">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                  {['', '', '', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map((date, index) => (
                    <span className={index === 5 || index === 9 ? 'has-plan' : ''} key={`${date}-${index}`}>
                      {date}{index === 5 ? <i /> : null}
                    </span>
                  ))}
                </div>
              </div>
              <div className="public-preview-copilot">
                <div className="public-preview-section-head"><div><b><Sparkles size={13} /> Copilot</b><small>A little help with your next move</small></div></div>
                <div className="public-copilot-message">Your upcoming deliverables are ready to review.</div>
                <span className="public-copilot-link">View your workspace <ArrowRight size={12} /></span>
              </div>
            </div>
            <div className="public-preview-caption"><span><i /> ILLUSTRATIVE PRODUCT PREVIEW</span><span>Uses your workspace records</span></div>
          </div>
        </div>
      </div>
      <div className="public-preview-float public-preview-float-ai"><Sparkles size={17} /><span>Creator Copilot</span></div>
      <div className="public-preview-float public-preview-float-chart">
        <div><BarChart3 size={16} /><span>Track your business</span></div>
        <span className="public-mini-chart"><i /><i /><i /><i /><i /><i /><i /></span>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setThemePreference } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="public-theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      onClick={() => setThemePreference(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-header-inner">
          <Link className="public-brand" to="/" aria-label="ByteForge home">
            <span className="public-brand-mark"><Sparkles size={18} /></span>
            <span>ByteForge</span>
          </Link>
          <nav className={`public-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {navigation.map(({ label, href }) => (
              <a key={href} href={href} onClick={closeMenu}>{label}</a>
            ))}
            <div className="public-mobile-actions">
              <ThemeToggle />
              <Link className="public-button public-button-quiet" to="/login" onClick={closeMenu}>Log in</Link>
              <Link className="public-button public-button-primary" to="/register" onClick={closeMenu}>Get started</Link>
            </div>
          </nav>
          <div className="public-header-actions">
            <ThemeToggle />
            <Link className="public-button public-button-quiet" to="/login">Log in</Link>
            <Link className="public-button public-button-primary" to="/register">Get started <ArrowUpRight size={15} /></Link>
          </div>
          <button
            type="button"
            className="public-menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        <section className="public-hero" id="home">
          <div className="public-hero-bg public-hero-bg-one" />
          <div className="public-hero-bg public-hero-bg-two" />
          <div className="public-hero-inner">
            <div className="public-hero-copy">
              <div className="public-hero-eyebrow"><span><Sparkles size={13} /></span> THE CREATOR BUSINESS WORKSPACE</div>
              <h1>Create Smarter.<br />Grow Faster.<br /><span>Stand Out.</span></h1>
              <p className="public-hero-description">
                Your AI-powered creator-business workspace to plan content, manage brand collaborations, understand your records, and find your next growth move.
              </p>
              <div className="public-hero-actions">
                <Link className="public-button public-button-primary public-button-large" to="/register">Get started <ArrowRight size={17} /></Link>
                <a className="public-button public-button-outline public-button-large" href="#features">Explore features <ArrowRight size={16} /></a>
              </div>
              <div className="public-hero-note"><Check size={14} /> One place for your creator business essentials</div>
            </div>
            <ProductPreview />
          </div>
          <div className="public-hero-bottom"><span>BUILT FOR INDEPENDENT CREATORS</span><i /><span>PLAN WITH INTENTION. GROW ON YOUR TERMS.</span></div>
        </section>

        <section className="public-section public-features" id="features">
          <div className="public-section-heading">
            <span className="public-overline">ONE WORKSPACE, MORE CLARITY</span>
            <h2>Everything You Need to <span>Grow</span></h2>
            <p>Practical tools for the business behind your creative work, connected in one thoughtful workspace.</p>
          </div>
          <div className="public-feature-grid">
            {features.map(({ icon: Icon, title, description, detail, tone }) => (
              <article className={`public-feature-card tone-${tone}`} key={title}>
                <span className="public-feature-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                {detail ? <small>{detail}</small> : null}
                <ArrowUpRight className="public-feature-arrow" size={17} />
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-solutions" id="solutions">
          <div className="public-solutions-intro">
            <span className="public-overline">MADE FOR YOUR KIND OF WORK</span>
            <h2>Your creative work.<br /><span>Your way of growing.</span></h2>
            <p>Whether you are building your first creator business or coordinating a growing portfolio, ByteForge brings the moving parts into view.</p>
            <Link className="public-text-link" to="/register">Explore your workspace <ArrowRight size={15} /></Link>
          </div>
          <div className="public-solution-list">
            {solutions.map(({ icon: Icon, title, description }, index) => (
              <article className="public-solution-card" key={title}>
                <span className="public-solution-index">0{index + 1}</span>
                <span className="public-solution-icon"><Icon size={19} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
                <ArrowUpRight size={16} className="public-solution-arrow" />
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-process" id="how-it-works">
          <div className="public-section-heading">
            <span className="public-overline">A CLEARER CREATOR WORKFLOW</span>
            <h2>From idea to <span>insight</span></h2>
            <p>Bring your creator-business essentials into a simple, repeatable rhythm.</p>
          </div>
          <div className="public-process-grid">
            <article><span className="public-step-number">01</span><div className="public-step-icon"><Lightbulb size={20} /></div><h3>Create</h3><p>Capture your ideas, campaigns, and creator-business details in one organized place.</p></article>
            <article><span className="public-step-number">02</span><div className="public-step-icon"><CalendarDays size={20} /></div><h3>Plan</h3><p>Organize upcoming content in the planner. ByteForge helps you plan; it does not publish posts.</p></article>
            <article><span className="public-step-number">03</span><div className="public-step-icon"><BarChart3 size={20} /></div><h3>Understand</h3><p>Review your stored business records and, when connected, available YouTube channel insights.</p></article>
          </div>
        </section>

        <section className="public-showcase" aria-labelledby="public-showcase-title">
          <div className="public-showcase-copy">
            <span className="public-overline">A BETTER VIEW OF YOUR CREATOR BUSINESS</span>
            <h2 id="public-showcase-title">Less scattered.<br /><span>More in sync.</span></h2>
            <p>Campaigns, planning, and financial records live side by side, so you can spend less time switching tools and more time focused on the work.</p>
            <ul>
              <li><Check size={15} /> Brand work and deliverables together</li>
              <li><Check size={15} /> A content plan that stays yours</li>
              <li><Check size={15} /> Business totals from your records</li>
            </ul>
            <Link className="public-button public-button-primary" to="/register">Get started <ArrowRight size={16} /></Link>
          </div>
          <div className="public-showcase-preview"><ProductPreview /></div>
        </section>

        <section className="public-section public-pricing" id="pricing">
          <div className="public-pricing-card">
            <div className="public-pricing-copy">
              <span className="public-overline">SIMPLE, TRANSPARENT, AND CREATOR-FOCUSED</span>
              <h2>Make room for <span>what’s next.</span></h2>
              <p>Published plan details are not available yet. Create an account to explore the current ByteForge workspace.</p>
              <Link className="public-button public-button-primary" to="/register">Get started <ArrowRight size={16} /></Link>
            </div>
            <div className="public-pricing-note"><span className="public-pricing-icon"><Sparkles size={20} /></span><b>Pricing details</b><p>We’ll share plan information when it’s ready. No made-up tiers or hidden promises.</p></div>
          </div>
        </section>

        <section className="public-about" id="about">
          <div className="public-about-mark"><Sparkles size={22} /></div>
          <span className="public-overline">ABOUT BYTEFORGE</span>
          <h2>Built around the <span>business of creating.</span></h2>
          <p>ByteForge brings the essential admin of creator work into one clear space, so independent creators can organize their work and make informed next steps.</p>
        </section>

        <section className="public-cta">
          <div className="public-cta-orb" />
          <div className="public-cta-copy">
            <span className="public-overline">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>Ready to Build Your<br /><span>Next Growth Story?</span></h2>
            <p>Bring your content workflow together with ByteForge.</p>
          </div>
          <div className="public-cta-actions">
            <Link className="public-button public-button-white" to="/register">Get started <ArrowRight size={16} /></Link>
            <Link className="public-cta-login" to="/login">Log in to your account <ArrowUpRight size={14} /></Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-main">
          <div className="public-footer-brand">
            <Link className="public-brand" to="/" aria-label="ByteForge home"><span className="public-brand-mark"><Sparkles size={18} /></span><span>ByteForge</span></Link>
            <p>A thoughtful workspace for the business behind your creative work.</p>
          </div>
          <div className="public-footer-links">
            <div><b>Explore</b><a href="#features">Features</a><a href="#solutions">Solutions</a><a href="#how-it-works">How it works</a></div>
            <div><b>ByteForge</b><a href="#about">About us</a><a href="#pricing">Pricing</a><Link to="/login">Log in</Link><Link to="/register">Get started</Link></div>
          </div>
        </div>
        <div className="public-footer-bottom"><span>© ByteForge. All rights reserved.</span><span>Made for creators building their next thing.</span></div>
      </footer>
    </div>
  );
}
