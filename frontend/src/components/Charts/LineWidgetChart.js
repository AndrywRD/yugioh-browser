import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function LineWidgetChart({ points }) {
    return (_jsx("div", { style: { width: "100%", height: 240 }, children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: points, children: [_jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "value", stroke: "#0f766e", strokeWidth: 2.5, dot: false })] }) }) }));
}
