import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0f766e", "#f59e0b", "#115e59", "#1d4ed8", "#b45309"];

type Props = {
  points: Array<{ name: string; value: number }>;
};

export default function PieWidgetChart({ points }: Props) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={points} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
            {points.map((point, index) => (
              <Cell key={point.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
