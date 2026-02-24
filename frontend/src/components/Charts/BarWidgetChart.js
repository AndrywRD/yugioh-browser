import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function BarWidgetChart({ points }) {
    return (_jsx("div", { style: { width: "100%", height: 240 }, children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: points, children: [_jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "value", fill: "#f59e0b", radius: [6, 6, 0, 0] })] }) }) }));
}
