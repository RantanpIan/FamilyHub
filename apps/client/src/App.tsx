import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusCard,
  type StatusTone,
} from "@familyhub/ui";
import { calendarModule } from "@familyhub/calendar-domain";
import { schoolModule } from "@familyhub/school-domain";
import { notificationsModule } from "@familyhub/notifications-domain";
import { AuthScreen } from "./auth/AuthScreen";
import { useAuth } from "./auth/useAuth";
import { getCallbackFlow } from "./auth/auth-utils";
import { ProfileScreen } from "./auth/ProfileScreen";
import { FamilyOnboarding } from "./family/FamilyOnboarding";
import { FamilyManagement } from "./family/FamilyManagement";
import { FamilyInvitationModal } from "./family/FamilyInvitationModal";
import { useFamily } from "./family/useFamily";
import { CalendarPage } from "./calendar/CalendarPage";

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
              status="Einzeltermine in Entwicklung"
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

type AppRoute = "/auth" | "/app" | "/profile";

function currentRoute(): AppRoute {
  if (
    window.location.pathname === "/auth" ||
    window.location.pathname === "/app" ||
    window.location.pathname === "/profile"
  ) {
    return window.location.pathname;
  }
  return window.location.pathname === "/" ? "/auth" : "/app";
}

export default function App() {
  const auth = useAuth();
  const family = useFamily();
  const [route, setRoute] = useState<AppRoute>(currentRoute);
  const [invitationDialogDismissedForSession, setInvitationDialogDismissedForSession] =
    useState<number | null>(null);
  const [profileRetrying, setProfileRetrying] = useState(false);
  const callbackFlow = getCallbackFlow(window.location.search);

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    if (replace) {
      window.history.replaceState(null, "", nextRoute);
    } else {
      window.history.pushState(null, "", nextRoute);
    }
    setRoute(nextRoute);
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (auth.status !== "ready" && auth.status !== "unconfigured") {
      return;
    }
    if (!auth.user && route !== "/auth") {
      window.history.replaceState(null, "", "/auth");
    } else if (
      auth.user &&
      route === "/auth" &&
      callbackFlow !== "password-recovery" &&
      !auth.passwordRecovery
    ) {
      window.history.replaceState(null, "", "/app");
    }
  }, [
    auth.status,
    auth.user,
    auth.passwordRecovery,
    callbackFlow,
    route,
  ]);

  if (auth.status === "loading") {
    return (
      <main className="auth-page">
        <LoadingState label="FamilyHub-Sitzung wird wiederhergestellt" />
      </main>
    );
  }

  if (!auth.user) {
    return (
      <AuthScreen
        initialMode={callbackFlow === "password-recovery" ? "recovery" : "sign-in"}
        onNavigate={navigate}
      />
    );
  }

  if (auth.profileStatus === "loading" || !auth.profile) {
    return (
      <main className="auth-page">
        {auth.profileStatus === "error" ? (
          <section className="auth-card">
            <ErrorState
              title="Profil konnte nicht geladen werden"
              description={auth.profileError ?? "Bitte versuche es erneut."}
            />
            <button
              className="primary-button"
              type="button"
              disabled={profileRetrying}
              onClick={() => {
                setProfileRetrying(true);
                auth.retryProfile();
                window.setTimeout(() => setProfileRetrying(false), 800);
              }}
            >
              Erneut versuchen
            </button>
          </section>
        ) : (
          <LoadingState label="Privates Profil wird geladen" />
        )}
      </main>
    );
  }

  if (
    callbackFlow === "password-recovery" ||
    auth.passwordRecovery
  ) {
    return <AuthScreen initialMode="recovery" onNavigate={navigate} />;
  }

  if (route === "/profile") {
    return <ProfileScreen onBack={() => navigate("/app")} />;
  }

  if (family.status === "loading") {
    return (
      <main className="auth-page">
        <LoadingState label="Familienbereich wird geladen" />
      </main>
    );
  }

  if (family.status === "error") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <ErrorState
            title="Familien konnten nicht geladen werden"
            description={family.error ?? "Bitte versuche es erneut."}
          />
          <button
            className="primary-button"
            type="button"
            onClick={() => void family.refreshFamilies()}
          >
            Erneut versuchen
          </button>
        </section>
      </main>
    );
  }

  if (family.families.length === 0) {
    return (
      <>
        <FamilyOnboarding />
        <InvitationDialog
          family={family}
          sessionGeneration={auth.sessionGeneration}
          dismissedSessionGeneration={invitationDialogDismissedForSession}
          onDismiss={setInvitationDialogDismissedForSession}
        />
      </>
    );
  }

  return (
    <>
      <AuthenticatedApp onProfile={() => navigate("/profile")} />
      <InvitationDialog
        family={family}
        sessionGeneration={auth.sessionGeneration}
        dismissedSessionGeneration={invitationDialogDismissedForSession}
        onDismiss={setInvitationDialogDismissedForSession}
      />
    </>
  );
}

function InvitationDialog({
  family,
  sessionGeneration,
  dismissedSessionGeneration,
  onDismiss,
}: {
  family: ReturnType<typeof useFamily>;
  sessionGeneration: number;
  dismissedSessionGeneration: number | null;
  onDismiss: (sessionGeneration: number) => void;
}) {
  if (
    family.pendingInvitations.length === 0 ||
    family.pendingInvitationsError ||
    dismissedSessionGeneration === sessionGeneration
  ) {
    return null;
  }
  return (
    <FamilyInvitationModal
      invitations={family.pendingInvitations}
      onRespond={async (invitationId, decision) => {
        await family.respondToInvitation(invitationId, decision);
      }}
      onRemindLater={() => onDismiss(sessionGeneration)}
    />
  );
}

function AuthenticatedApp({ onProfile }: { onProfile: () => void }) {
  const [activePage, setActivePage] = useState<PageId>("today");
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const { profile, signOut } = useAuth();
  const family = useFamily();

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch {
      setSignOutError("Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
    }
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <a className="skip-link" href="#main-content">Zum Hauptinhalt springen</a>
      <aside className="sidebar">
        <button
          className="brand brand-button"
          type="button"
          aria-label="Zur Startseite"
          onClick={() => setActivePage("today")}
        >
          <span className="brand-mark" aria-hidden="true">f</span>
          <span>family<span className="brand-accent">hub</span></span>
        </button>
        <span className="sidebar-caption">EURE FAMILIE, GUT ORGANISIERT</span>
        <Navigation activePage={activePage} onNavigate={setActivePage} />
        <div className="sidebar-footer">
          <span className="footer-dot" aria-hidden="true" />
          <span>Angemeldet · Funktionen im Aufbau</span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">f</span>
            <span>family<span className="brand-accent">hub</span></span>
          </div>
          {family.selectedFamily && (
            <label className="family-context-label topbar-family-context">
              Familie
              <select
                aria-label="Aktive Familie"
                value={family.selectedFamily.family_id}
                disabled={family.families.length < 2}
                onChange={(event) => family.selectFamily(event.currentTarget.value)}
              >
                {family.families.map((item) => (
                  <option key={item.family_id} value={item.family_id}>
                    {item.family_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="topbar-note">Angemeldet als {profile?.display_name}</span>
          <button className="account-button" type="button" aria-label="Profil öffnen" onClick={onProfile}>
            <span className="avatar-placeholder" aria-hidden="true">
              {profile?.display_name.slice(0, 1).toUpperCase() ?? "F"}
            </span>
            <span className="account-name">{profile?.display_name}</span>
          </button>
          <button className="text-button sign-out-button" type="button" onClick={() => void handleSignOut()}>
            Abmelden
          </button>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          {signOutError && <ErrorState description={signOutError} />}
          {activePage === "more" ? (
            <FamilyManagement key={family.selectedFamily?.family_id ?? "no-family"} />
          ) : activePage === "calendar" ? (
            <CalendarPage key={family.selectedFamily?.family_id ?? "no-family"} />
          ) : (
            <PageContent page={activePage} />
          )}
          <section className="foundation-note" aria-label="Status">
            <div className="foundation-note-icon" aria-hidden="true">✳</div>
            <div>
              <h2>Schön, dass ihr da seid.</h2>
              <p>Deine Profilangaben sind geschützt und werden ausschließlich deinem Konto zugeordnet.</p>
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
    <nav
      className={mobile ? "main-nav mobile-nav" : "main-nav"}
      aria-label={mobile ? "Mobile Hauptnavigation" : "Desktop Hauptnavigation"}
    >
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
          {item.id !== "today" && item.id !== "more" && item.id !== "calendar" && (
            <span className="nav-status">Demnächst</span>
          )}
        </button>
      ))}
    </nav>
  );
}

