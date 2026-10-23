import { useContext } from "react";
import { FamilyContext } from "./family-context";

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily muss innerhalb des FamilyProvider verwendet werden.");
  }
  return context;
}
