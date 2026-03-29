export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <p className="footer-copy">
          © {year} ETF Overlap Analysis. Free portfolio overlap calculator.
        </p>
        <nav className="footer-links" aria-label="Footer navigation">
          <a
            href="https://github.com/suminb/etf-overlap"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
