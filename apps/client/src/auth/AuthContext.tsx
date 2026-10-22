import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  NewPasswordSchema,
  PasswordResetRequestSchema,
  SignInInputSchema,
  SignUpInputSchema,
  UpdateProfileInputSchema,
  UserProfileSchema,
  type NewPassword,
  type PasswordResetRequest,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
  type UserProfile,
} from "@familyhub/contracts";
import { createAuthCallbackUrl, getErrorMessage } from "./auth-utils";
import { browserAuthConfig } from "./auth-client";
import { ensureUserProfile } from "./profile-service";
import { AuthContext, type AuthContextValue } from "./auth-context";
import type { AuthStatus, ProfileStatus } from "./auth-context";

function requireClient() {
  if (!browserAuthConfig.configured) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }
  return browserAuthConfig.client;
}

function checked<T>(schema: { parse: (input: unknown) => T }, input: unknown): T {
  return schema.parse(input);
}

function profileUserId(profile: UserProfile | null): string | null {
  return profile?.user_id ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = browserAuthConfig.client;
  const configured = browserAuthConfig.configured;
  const configurationMessage = configured ? null : browserAuthConfig.reason;
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "unconfigured",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const authEventSeen = useRef(false);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      authEventSeen.current = true;
      if (!active) {
        return;
      }

      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) {
        activeUserId.current = nextUserId;
        setProfile(null);
        setProfileError(null);
        setProfileStatus(nextUserId ? "loading" : null);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileStatus(null);
        setProfileError(null);
        setPasswordRecovery(false);
      } else if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      } else if (event === "SIGNED_IN") {
        setPasswordRecovery(false);
      }

      setSession(nextSession);
      setStatus("ready");
      setError(null);
    });

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventSeen.current) {
        return;
      }

      if (sessionError) {
        setStatus("error");
        setError(getErrorMessage(sessionError));
        return;
      }

      setSession(data.session);
      setStatus("ready");
    }).catch((sessionError: unknown) => {
      if (active && !authEventSeen.current) {
        setStatus("error");
        setError(getErrorMessage(sessionError));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const user = session?.user ?? null;

  useEffect(() => {
    if (!client || !user) {
      return;
    }

    let active = true;
    void ensureUserProfile(client, user).then((nextProfile) => {
      if (active) {
        setProfile(nextProfile);
        setProfileStatus("ready");
      }
    }).catch((profileLoadError: unknown) => {
      if (active) {
        setProfileError(getErrorMessage(profileLoadError));
        setProfileStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, [client, user, profileRetry]);

  const signIn = useCallback(async (input: SignInInput) => {
    const parsed = checked(SignInInputSchema, input);
    const { error: authError } = await requireClient().auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });
    if (authError) {
      throw authError;
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const parsed = checked(SignUpInputSchema, input);
    const redirectTo = createAuthCallbackUrl(
      window.location.origin,
      "email-confirmation",
    );
    if (!redirectTo) {
      throw new Error("Diese Adresse ist für den E-Mail-Rücksprung nicht zulässig.");
    }

    const { data, error: authError } = await requireClient().auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: parsed.displayName },
      },
    });
    if (authError) {
      throw authError;
    }

    return data.session ? "signed-in" : "confirmation-required";
  }, []);

  const signOut = useCallback(async () => {
    const { error: authError } = await requireClient().auth.signOut({ scope: "local" });
    if (authError) {
      throw authError;
    }
    setSession(null);
    setProfile(null);
    setStatus("ready");
  }, []);

  const requestPasswordReset = useCallback(async (input: PasswordResetRequest) => {
    const parsed = checked(PasswordResetRequestSchema, input);
    const redirectTo = createAuthCallbackUrl(
      window.location.origin,
      "password-recovery",
    );
    if (!redirectTo) {
      throw new Error("Diese Adresse ist für den Passwort-Rücksprung nicht zulässig.");
    }

    const { error: authError } = await requireClient().auth.resetPasswordForEmail(
      parsed.email,
      { redirectTo },
    );
    if (authError) {
      throw authError;
    }
  }, []);

  const updatePassword = useCallback(async (input: NewPassword) => {
    const parsed = checked(NewPasswordSchema, input);
    const { error: authError } = await requireClient().auth.updateUser({
      password: parsed.password,
    });
    if (authError) {
      throw authError;
    }
    setPasswordRecovery(false);
  }, []);

  const updateDisplayName = useCallback(async (input: UpdateProfileInput) => {
    const parsed = checked(UpdateProfileInputSchema, input);
    const currentUser = client ? session?.user : null;
    if (!client || !currentUser) {
      throw new Error("Für diese Änderung ist eine aktive Anmeldung erforderlich.");
    }

    const { data, error: updateError } = await client
      .from("user_profiles")
      .update({ display_name: parsed.displayName })
      .eq("user_id", currentUser.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    setProfile(UserProfileSchema.parse(data));
  }, [client, session?.user]);

  const retryProfile = useCallback(() => {
    setProfileError(null);
    setProfileStatus("loading");
    setProfileRetry((value) => value + 1);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      profile,
      profileStatus:
        profileUserId(profile) === user?.id ? profileStatus : user ? "loading" : null,
      profileError,
      error,
      configured,
      configurationMessage,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateDisplayName,
      retryProfile,
      clearError,
    }),
    [
      status,
      session,
      user,
      profile,
      profileStatus,
      profileError,
      error,
      configured,
      configurationMessage,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateDisplayName,
      retryProfile,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
