import { useContext } from "react";
import { AuthContext } from "./auth-context";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb des AuthProvider verwendet werden.");
  }
  return context;
}
