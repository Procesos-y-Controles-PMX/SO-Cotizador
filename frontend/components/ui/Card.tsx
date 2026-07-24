export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`rounded-sm border border-line bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  accentColor?: "blue" | "green" | "red" | "orange";
}

const accentMap = {
  blue: { iconBg: "bg-blue-100", iconText: "text-blue-500", underline: "bg-blue-400" },
  green: { iconBg: "bg-emerald-100", iconText: "text-emerald-600", underline: "bg-emerald-400" },
  red: { iconBg: "bg-red-100", iconText: "text-red-500", underline: "bg-red-400" },
  orange: { iconBg: "bg-amber-100", iconText: "text-amber-600", underline: "bg-amber-400" },
};

export function StatCard({ icon, value, label, sublabel, accentColor = "blue" }: StatCardProps) {
  const colors = accentMap[accentColor];
  return (
    <Card className="relative overflow-hidden">
      <div className="flex flex-col gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-sm ${colors.iconBg} ${colors.iconText}`}>
          {icon}
        </div>
        <div>
          <p className="mb-1 text-[13px] text-fg-subtle">{label}</p>
          <p className="text-[28px] font-bold leading-none tracking-tight text-fg">{value}</p>
          {sublabel ? <p className="mt-1.5 text-[12px] text-fg-faint">{sublabel}</p> : null}
        </div>
        <div className={`h-[3px] w-10 rounded-sm ${colors.underline}`} />
      </div>
    </Card>
  );
}
