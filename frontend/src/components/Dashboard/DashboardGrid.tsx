import WidgetRenderer from "../Widgets/WidgetRenderer";

type Props = {
  widgets: Array<{
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
    data: {
      metric_name?: string;
      metric_value?: number;
      timestamp?: string;
    };
  }>;
};

export default function DashboardGrid({ widgets }: Props) {
  if (widgets.length === 0) {
    return <div className="panel">No widgets configured for this dashboard.</div>;
  }

  return (
    <div className="grid grid-2">
      {widgets.map((widget) => (
        <WidgetRenderer key={widget.id} widget={widget} />
      ))}
    </div>
  );
}
