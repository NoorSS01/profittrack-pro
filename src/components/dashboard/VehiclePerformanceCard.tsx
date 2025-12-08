import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface VehiclePerformanceProps {
  vehicleName: string;
  km: number;
  earnings: number;
  profit: number;
  fuelUsed: number;
  delay?: number;
}

export const VehiclePerformanceCard = ({
  vehicleName,
  km,
  earnings,
  profit,
  fuelUsed,
  delay = 0,
}: VehiclePerformanceProps) => {
  const { formatCurrency } = useCurrency();
  const profitColor = profit >= 0 ? "text-success" : "text-destructive";
  
  return (
    <Card 
      className="transition-all duration-300 animate-fade-in border-border/50 touch-feedback card-interactive"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
            <Gauge className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-semibold text-base md:text-lg">{vehicleName}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="p-2 md:p-3 rounded-lg bg-muted/30">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Kilometers</p>
            <p className="text-lg md:text-xl font-bold">{km.toFixed(1)} km</p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-primary/5">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Earnings</p>
            <p className="text-lg md:text-xl font-bold text-primary">{formatCurrency(earnings)}</p>
          </div>
          <div className={`p-2 md:p-3 rounded-lg ${profit >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{profit >= 0 ? 'Profit' : 'Loss'}</p>
            <p className={`text-lg md:text-xl font-bold ${profitColor}`}>{formatCurrency(Math.abs(profit))}</p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-accent/5">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Fuel Used</p>
            <p className="text-lg md:text-xl font-bold text-accent">{fuelUsed.toFixed(1)}L</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
