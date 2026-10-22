import { useState } from "react";
import {
  EmptyState,
  StatusCard,
  type StatusTone,
} from "@familyhub/ui";
import { calendarModule } from "@familyhub/calendar-domain";
import { schoolModule } from "@familyhub/school-domain";
import { notificationsModule } from "@familyhub/notifications-domain";

const navigation = [
  { id: "today", label: "Heute", icon: "◷" },
  { id: "calendar", label: "Kalender", icon: "▦" },
  { id: "tasks", label: "Aufgaben", icon: "✓" },
  { id: "school", label: "Schule", icon: "⌂" },
  { id: "more", label: "Mehr", icon: "•••" },
] as const;

type PageId = (typeof navigation)[number]["id"];

const modules: { name: string; status: string; tone: StatusTone }[] = [
  { name: "Kalender", status: calendarModule.statusLabel, tone: "neutral" },
  { name: "Schule", status: schoolModule.statusLabel, tone: "neutral" },
  { name: "Benachrichtigungen", status: notificationsModule.statusLabel, tone: "neutral" },
];

const unavailableCopy: Record<Exclude<PageId, "today" | "more">, { title: string; description: string }> = {
  calendar: {
    title: "Der Familienkalender ist noch nicht verfügbar",
    description: "Das Kalendermodul wird in einem späteren Entwicklungsschritt ergänzt.",
  },
  tasks: {
    title: "Aufgaben sind noch nicht verfügbar",
    description: "Die Aufgabenübersicht ist für einen späteren Entwicklungsschritt vorgesehen.",
  },
  school: {
    title: "Der Schulbereich ist noch nicht verfügbar",
    description: "Stundenpläne und Schulorganisation sind noch nicht implementiert.",
  },
};

function PageContent({ page }: { page: PageId }) {
  if (page === "today") {
    return (
      <>
        <section className="welcome-card" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <span className="eyebrow">Euer Zuhause für den Familienalltag</span>
            <h2 id="welcome-title">Alles im Blick.<br />Mehr Zeit füreinander.</h2>
            <p>Ein gemeinsamer Ort für das, was euren Alltag leichter macht.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="art-sun" />
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-leaf leaf-one" />
            <span className="art-leaf leaf-two" />
          </div>
        </section>

        <section className="overview-section" aria-labelledby="overview-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Euer Überblick</span>
              <h2 id="overview-title">Ein guter Start</h2>
            </div>
            <span className="today-label">FamilyHub Foundation</span>
          </div>
          <div className="overview-grid">
            <StatusCard
              icon="▦"
              eyebrow="EURE TERMINE"
              title="Kalender"
              description="Gemeinsame und private Termine an einem Ort."
              status="Noch nicht verfügbar"
              tone="neutral"
            />
            <StatusCard
              icon="✓"
              eyebrow="KLEINE SCHRITTE"
              title="Aufgaben"
              description="Aufgaben für den Familienalltag."
              status="Noch nicht verfügbar"
              tone="neutral"
            />
            <StatusCard
              icon="⌂"
              eyebrow="GUT ORGANISIERT"
              title="Schule"
              description="Stundenpläne und Schulorganisation."
              status="Noch nicht verfügbar"
              tone="neutral"
            />
          </div>
        </section>
      </>
    );
  }

  if (page === "more") {
    return (
      <section className="page-section" aria-labelledby="modules-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FamilyHub</span>
            <h2 id="modules-title">Mehr entdecken</h2>
          </div>
        </div>
        <p className="page-intro">
          Die Foundation steht. Fachfunktionen werden in späteren Aufträgen ergänzt.
        </p>
        <div className="module-list">
          {modules.map((module) => (
            <StatusCard
              key={module.name}
              title={module.name}
              description="Das Fachmodul ist vorbereitet, aber noch nicht implementiert."
              status={module.status}
              tone={module.tone}
              compact
            />
          ))}
          <StatusCard
            title="Anmeldung und Familien"
            description="Es gibt noch keine Registrierung und keine persönlichen Familiendaten."
            status="Nicht verfügbar"
            tone="neutral"
            compact
          />
        </div>
      </section>
    );
  }

  const content = unavailableCopy[page];
  return (
    <section className="page-section" aria-labelledby="unavailable-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{navigation.find((item) => item.id === page)?.label}</span>
          <h2 id="unavailable-title">In Vorbereitung</h2>
        </div>
      </div>
      <EmptyState title={content.title} description={content.description} />
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("today");

  return (
    <div className="app-shell" data-testid="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="FamilyHub Startseite">
          <span className="brand-mark" aria-hidden="true">f</span>
          <span>family<span className="brand-accent">hub</span></span>
        </a>
        <span className="sidebar-caption">EURE FAMILIE, GUT ORGANISIERT</span>
        <Navigation activePage={activePage} onNavigate={setActivePage} />
        <div className="sidebar-footer">
          <span className="footer-dot" aria-hidden="true" />
          <span>Foundation · Funktionen im Aufbau</span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">f</span>
            <span>family<span className="brand-accent">hub</span></span>
          </div>
          <span className="topbar-note">Ein geschützter Ort für euren Alltag</span>
          <span className="avatar-placeholder" aria-label="Keine Anmeldung">FH</span>
        </header>
        <main className="main-content">
          <PageContent page={activePage} />
          <section className="foundation-note" aria-label="Status">
            <div className="foundation-note-icon" aria-hidden="true">✳</div>
            <div>
              <h2>Schön, dass ihr da seid.</h2>
              <p>FamilyHub wird Schritt für Schritt aufgebaut. Persönliche Daten werden in dieser Version nicht gespeichert.</p>
            </div>
          </section>
        </main>
        <footer className="site-footer">FamilyHub · Ein ruhigerer Familienalltag beginnt hier</footer>
      </div>
      <Navigation activePage={activePage} onNavigate={setActivePage} mobile />
    </div>
  );
}

function Navigation({
  activePage,
  onNavigate,
  mobile = false,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobile?: boolean;
}) {
  return (
    <nav className={mobile ? "main-nav mobile-nav" : "main-nav"} aria-label="Hauptnavigation">
      {navigation.map((item) => (
        <button
          key={item.id}
          className={`nav-item${activePage === item.id ? " is-active" : ""}`}
          type="button"
          aria-current={activePage === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {item.id !== "today" && item.id !== "more" && (
            <span className="nav-status">Demnächst</span>
          )}
        </button>
      ))}
    </nav>
  );
}
