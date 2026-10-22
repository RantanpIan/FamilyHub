import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type {
  NewPassword,
  PasswordResetRequest,
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
  UserProfile,
} from "@familyhub/contracts";

export type AuthStatus = "loading" | "ready" | "error" | "unconfigured";
export type ProfileStatus = "loading" | "ready" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  profileStatus: ProfileStatus | null;
  profileError: string | null;
  error: string | null;
  configured: boolean;
  configurationMessage: string | null;
  passwordRecovery: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<"confirmation-required" | "signed-in">;
  signOut: () => Promise<void>;
  requestPasswordReset: (input: PasswordResetRequest) => Promise<void>;
  updatePassword: (input: NewPassword) => Promise<void>;
  updateDisplayName: (input: UpdateProfileInput) => Promise<void>;
  retryProfile: () => void;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
