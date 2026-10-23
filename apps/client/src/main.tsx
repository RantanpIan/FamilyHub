import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { FamilyProvider } from "./family/FamilyProvider";
import "./styles.css";
import "@familyhub/ui/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <FamilyProvider>
        <App />
      </FamilyProvider>
    </AuthProvider>
  </StrictMode>,
);
