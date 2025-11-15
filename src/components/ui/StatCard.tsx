/**
 * Stat Card Component
 * Displays a statistic with an icon and label
 */

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "yellow" | "purple" | "red" | "gray";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = "blue",
  className = "",
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
    gray: "bg-gray-500",
  };

  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              <div
                className={`w-12 h-12 ${colorClasses[color]} rounded-md flex items-center justify-center`}
              >
                {icon}
              </div>
            </div>
          )}
          <div className={`${icon ? "ml-5" : ""} w-0 flex-1`}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
                {trend && (
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      trend.isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <svg
                      className={`self-center flex-shrink-0 h-5 w-5 ${
                        trend.isPositive ? "" : "transform rotate-180"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-1">{Math.abs(trend.value)}%</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
