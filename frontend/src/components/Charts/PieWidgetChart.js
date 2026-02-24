import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
const COLORS = ["#0f766e", "#f59e0b", "#115e59", "#1d4ed8", "#b45309"];
export default function PieWidgetChart({ points }) {
    return (_jsx("div", { style: { width: "100%", height: 240 }, children: _jsx(ResponsiveContainer, { children: _jsxs(PieChart, { children: [_jsx(Pie, { data: points, dataKey: "value", nameKey: "name", innerRadius: 50, outerRadius: 90, children: points.map((point, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, point.name))) }), _jsx(Tooltip, {})] }) }) }));
}
