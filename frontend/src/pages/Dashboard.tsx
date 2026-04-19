/** Dashboard page — Widget grid with quick-action buttons. */

import { useNavigate } from "react-router-dom";
import { Droplets, LayoutDashboard, Moon, Plus, Utensils } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { SleepWidget } from "../plugins/sleep/SleepWidget";
import { FeedingWidget } from "../plugins/feeding/FeedingWidget";
import { DiaperWidget } from "../plugins/diaper/DiaperWidget";

export default function Dashboard() {
  const { activeChild } = useActiveChild();
  const navigate = useNavigate();

  if (!activeChild) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Kein Kind angelegt"
        description="Lege zuerst ein Kind an, um das Dashboard zu sehen."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-headline text-lg font-semibold">
        {activeChild.name}
      </h2>

      {/* Quick Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <Button
          variant="secondary"
          onClick={() => navigate("/sleep?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Moon className="h-4 w-4" />
          Schlaf
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/feeding?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Utensils className="h-4 w-4" />
          Mahlzeiten
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/diaper?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Droplets className="h-4 w-4" />
          Windel
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SleepWidget childId={activeChild.id} />
        <FeedingWidget childId={activeChild.id} />
        <DiaperWidget childId={activeChild.id} />
      </div>
    </div>
  );
}
