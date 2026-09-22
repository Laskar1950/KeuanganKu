import { ChartNoAxesColumn, Home, ReceiptText, Settings, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "transactions", label: "Catat", icon: ReceiptText },
  { id: "budgets", label: "Budget", icon: Target },
  { id: "reports", label: "Laporan", icon: ChartNoAxesColumn },
  { id: "settings", label: "Profil", icon: Settings },
];

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="absolute right-[18px] bottom-[18px] left-[18px] z-20 grid grid-cols-5 gap-1 overflow-hidden rounded-[28px] border border-nav-border bg-nav-bg p-2 shadow-soft-hover backdrop-blur-[18px] max-[390px]:right-3 max-[390px]:bottom-3.5 max-[390px]:left-3 max-[390px]:gap-1 max-[390px]:p-1.5"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            title={tab.label}
            className={cn(
              "grid min-h-14 w-full min-w-0 place-items-center content-center justify-center gap-[3px] overflow-hidden rounded-[20px] px-0.5 py-[7px] text-[10px] leading-[1.1] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-strong max-[390px]:min-h-[54px]",
              isActive
                ? "text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                : "bg-transparent text-muted-foreground hover:text-rose-strong"
            )}
          >
            <Icon size={18} />
            <span className="block w-full truncate text-center text-[10px] leading-[1.1] max-[390px]:text-[9px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
