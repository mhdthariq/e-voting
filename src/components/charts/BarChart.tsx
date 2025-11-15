/**
 * Simple Bar Chart Component
 * Displays data as vertical bars using SVG
 */

"use client";

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  className?: string;
}

export function BarChart({ data, height = 200, className = "" }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * (height - 40);
            const x = (index * barWidth) + (barWidth * 0.1);
            const y = height - barHeight - 30;
            const color = item.color || "#3B82F6";

            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={`${x}%`}
                  y={y}
                  width={`${barWidth * 0.8}%`}
                  height={barHeight}
                  fill={color}
                  className="transition-all hover:opacity-80"
                  rx="4"
                />
                {/* Value label */}
                <text
                  x={`${x + (barWidth * 0.4)}%`}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {item.value}
                </text>
                {/* X-axis label */}
                <text
                  x={`${x + (barWidth * 0.4)}%`}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
