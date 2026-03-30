"use client";

import { format, addDays, setHours, setMinutes } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SLOT_DURATION_MINUTES = 30;
const START_HOUR = 9;
const END_HOUR = 17;

function generateSlotsForDate(date: Date): Date[] {
  const slots: Date[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
      slots.push(setMinutes(setHours(date, h), m));
    }
  }
  return slots;
}

export type BookedSlot = { startsAt: string; endsAt: string };

function isSlotBooked(
  slot: Date,
  bookedSlots: BookedSlot[],
  durationMs: number
): boolean {
  const slotEnd = new Date(slot.getTime() + durationMs);
  return bookedSlots.some((b) => {
    const start = new Date(b.startsAt).getTime();
    const end = new Date(b.endsAt).getTime();
    const slotStart = slot.getTime();
    return slotStart < end && slotEnd.getTime() > start;
  });
}

export type TimeSlotPickerProps = {
  selectedSlot: Date | null;
  onSelect: (slot: Date) => void;
  disabled?: boolean;
  bookedSlots?: BookedSlot[];
};

export function TimeSlotPicker({
  selectedSlot,
  onSelect,
  disabled = false,
  bookedSlots = [],
}: TimeSlotPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const allSlots = dates.flatMap((d) => generateSlotsForDate(d));

  const now = new Date();
  const availableSlots = allSlots.filter((s) => s > now);
  const durationMs = SLOT_DURATION_MINUTES * 60 * 1000;

  return (
    <Card className="border-border/80 bg-card/90 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Select date & time
        </CardTitle>
        <CardDescription className="text-xs">
          Choose an available slot. Greyed-out slots are already booked.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
          {availableSlots.slice(0, 48).map((slot) => {
            const isSelected = selectedSlot?.getTime() === slot.getTime();
            const isBooked = isSlotBooked(slot, bookedSlots, durationMs);
            return (
              <button
                key={slot.toISOString()}
                type="button"
                onClick={() => !isBooked && onSelect(slot)}
                disabled={disabled || isBooked}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  isBooked
                    ? "cursor-not-allowed border-border/40 bg-muted/50 text-muted-foreground opacity-60"
                    : isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background/60 hover:bg-muted/50"
                }`}
              >
                {format(slot, "MMM d, h:mm a")}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
