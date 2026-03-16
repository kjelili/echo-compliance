export default function LandingHero({ onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero__content">
        <span className="chip">AI-Powered Site Compliance</span>
        <h1>Capture site updates once. Generate compliance-ready logs in seconds.</h1>
        <p>
          Echo Compliance turns spoken or typed foreman updates into clean daily logs, searchable
          history, and PDF-ready reports your team can trust.
        </p>
        <button onClick={onGetStarted} className="btn btn--primary">
          Start Daily Log
        </button>
      </div>
      <div className="hero__metrics">
        <div className="metric">
          <strong>3x</strong>
          <span>faster reporting</span>
        </div>
        <div className="metric">
          <strong>100%</strong>
          <span>searchable history</span>
        </div>
        <div className="metric">
          <strong>1 click</strong>
          <span>PDF export</span>
        </div>
      </div>
    </section>
  );
}
