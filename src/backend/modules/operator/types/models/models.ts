/** Row do operators retornada pelo Drizzle */
export type OperatorRow = {
  id: string;
  userId: string;
  businessId: string;
  tenantId: string;
  displayName: string;
  canEditService: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Row do operator_services retornada pelo Drizzle */
export type OperatorServiceRow = {
  id: string;
  operatorId: string;
  serviceId: string;
  priceCents: number | null;
  durationMinutes: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
