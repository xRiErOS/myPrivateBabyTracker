/** Admin hub page — navigation tiles for management pages. */

import { Baby, ClipboardList, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";

interface AdminTile {
  to: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

const TILES: AdminTile[] = [
  {
    to: "/admin/children",
    icon: Baby,
    label: "Kinder",
    description: "Kinder verwalten, Geburtsdaten, aktives Kind",
  },
  {
    to: "/admin/medication-masters",
    icon: ClipboardList,
    label: "Medikamentenliste",
    description: "Stammdaten fuer Medikamenten-Dropdown",
  },
];

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-mauve" />
        <h2 className="font-headline text-lg font-semibold">Verwaltung</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, label, description }) => (
          <Card
            key={to}
            className="flex flex-col items-center gap-2 p-4 cursor-pointer active:bg-surface1 transition-colors"
            onClick={() => navigate(to)}
          >
            <Icon className="h-8 w-8 text-mauve" />
            <span className="font-label text-sm font-medium text-text text-center">
              {label}
            </span>
            <span className="font-body text-xs text-subtext0 text-center">
              {description}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
