import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo-icon" aria-hidden="true">
            ⊙
          </div>
          <div>
            <div className="header-brand-name">ETF Overlap</div>
            <div className="header-brand-tagline">Portfolio Analysis Tool</div>
          </div>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
