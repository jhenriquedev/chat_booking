/** Row do availability_rules retornada pelo Drizzle */
export type AvailabilityRuleRow = {
  id: string;
  operatorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
