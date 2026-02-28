/** Row do schedule_slots retornada pelo Drizzle */
export type ScheduleSlotRow = {
  id: string;
  operatorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
