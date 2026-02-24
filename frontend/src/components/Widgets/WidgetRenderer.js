import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import BarWidgetChart from "../Charts/BarWidgetChart";
import LineWidgetChart from "../Charts/LineWidgetChart";
import PieWidgetChart from "../Charts/PieWidgetChart";
const samplePoints = [
    { name: "Mon", value: 24 },
    { name: "Tue", value: 31 },
    { name: "Wed", value: 28 },
    { name: "Thu", value: 42 },
    { name: "Fri", value: 37 },
];
export default function WidgetRenderer({ widget }) {
    if (widget.type === "number") {
        return (_jsxs("div", { className: "card", children: [_jsx("span", { className: "badge", children: widget.data.metric_name ?? "KPI" }), _jsx("p", { className: "kpi-value", children: (widget.data.metric_value ?? 0).toLocaleString() }), _jsxs("small", { className: "status", children: ["Last update: ", widget.data.timestamp ?? "-"] })] }));
    }
    if (widget.type === "bar_chart") {
        return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: widget.name }), _jsx(BarWidgetChart, { points: samplePoints })] }));
    }
    if (widget.type === "pie_chart") {
        return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: widget.name }), _jsx(PieWidgetChart, { points: samplePoints })] }));
    }
    if (widget.type === "table") {
        return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: widget.name }), _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Dimension" }), _jsx("th", { children: "Value" })] }) }), _jsx("tbody", { children: samplePoints.map((point) => (_jsxs("tr", { children: [_jsx("td", { children: point.name }), _jsx("td", { children: point.value })] }, point.name))) })] })] }));
    }
    return (_jsxs("div", { className: "card", children: [_jsx("h3", { children: widget.name }), _jsx(LineWidgetChart, { points: samplePoints })] }));
}
