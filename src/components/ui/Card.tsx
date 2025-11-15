/**
 * Reusable Card Component
 * Modern card component for displaying content with consistent styling
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "small" | "medium" | "large";
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ 
  children, 
  className = "", 
  padding = "medium",
  hover = false,
  onClick 
}: CardProps) {
  const paddingClasses = {
    none: "p-0",
    small: "p-3",
    medium: "p-5",
    large: "p-8",
  };

  const hoverClass = hover ? "hover:shadow-lg transition-shadow cursor-pointer" : "";

  return (
    <div 
      className={`bg-white rounded-lg shadow ${paddingClasses[padding]} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}
