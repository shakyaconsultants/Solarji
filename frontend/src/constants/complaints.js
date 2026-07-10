export const COMPLAINT_CATEGORIES = [
  'Inverter Fault',
  'Battery Not Charging',
  'Battery Failure',
  'Solar Panel Damage',
  'Low Power Generation',
  'No Power Output from Solar System',
  'Charge Controller Fault',
  'Net Meter Fault',
  'Wiring Fault',
  'Earthing/Grounding Issue',
  'MCB/Breaker Tripping Frequently',
  'Solar System Not Switching to Battery Backup',
  'Inverter Display Error',
  'Communication/Monitoring System Fault',
  'Battery Backup Duration Reduced',
  'Panel Cleaning/Maintenance Required',
  'Overheating of Inverter',
  'DC Cable Fault',
  'AC Output Fault',
  'Hybrid Inverter Malfunction',
  'System Shutdown/Not Starting',
  'Unknown Electrical Fault',
  'Other Technical Issue',
];

export const COMPLAINT_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export const statusBadgeClass = (status) => {
  if (status === 'Open') return 'bg-blue-100 text-blue-700';
  if (status === 'In Progress') return 'bg-amber-100 text-amber-800';
  if (status === 'Resolved') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
};
