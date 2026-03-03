import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartChange: (date: Date | undefined) => void;
  onEndChange: (date: Date | undefined) => void;
  onClear: () => void;
}

const presets = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Este ano", days: -1 },
];

export function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onClear }: DateRangeFilterProps) {
  const applyPreset = (days: number) => {
    const end = new Date();
    if (days === -1) {
      onStartChange(new Date(end.getFullYear(), 0, 1));
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      onStartChange(start);
    }
    onEndChange(end);
  };

  const hasFilter = startDate || endDate;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border/50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-border/50 mx-1" />

      {/* Start Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 px-3 text-xs font-normal border-border/50 bg-secondary",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="w-3 h-3 mr-1.5" />
            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={onStartChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <span className="text-xs text-muted-foreground">até</span>

      {/* End Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 px-3 text-xs font-normal border-border/50 bg-secondary",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="w-3 h-3 mr-1.5" />
            {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {hasFilter && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3 h-3" />
          Limpar
        </button>
      )}
    </div>
  );
}
