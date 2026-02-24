import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAuthToken } from "../services/api";
import { useAuthStore } from "../store/useDashboardStore";
export default function LoginPage() {
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);
    const [email, setEmail] = useState("admin@example.com");
    const [password, setPassword] = useState("admin123");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const onSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await login(email, password);
            setToken(response.access_token);
            setAuthToken(response.access_token);
            localStorage.setItem("kpi_dashboard_token", response.access_token);
            navigate("/dashboards", { replace: true });
        }
        catch {
            setError("Invalid credentials");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "panel", style: { maxWidth: 420, margin: "80px auto" }, children: [_jsx("h2", { className: "page-title", children: "Sign in" }), _jsx("p", { className: "status", children: "Use your dashboard credentials to access KPI data." }), _jsxs("form", { onSubmit: onSubmit, className: "grid", children: [_jsx("input", { className: "input", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email" }), _jsx("input", { className: "input", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password" }), _jsx("button", { className: "button", disabled: loading, children: loading ? "Signing in..." : "Sign in" }), error && _jsx("p", { className: "status error", children: error })] })] }));
}
