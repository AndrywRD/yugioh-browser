import { jsx as _jsx } from "react/jsx-runtime";
import WidgetRenderer from "../Widgets/WidgetRenderer";
export default function DashboardGrid({ widgets }) {
    if (widgets.length === 0) {
        return _jsx("div", { className: "panel", children: "No widgets configured for this dashboard." });
    }
    return (_jsx("div", { className: "grid grid-2", children: widgets.map((widget) => (_jsx(WidgetRenderer, { widget: widget }, widget.id))) }));
}
