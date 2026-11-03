const base = {
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true,
};
const Icon = ({ size, children }) => (
  <svg {...base} {...(size ? { width: size, height: size } : {})}>{children}</svg>
);

export const PlusIcon = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const ChevronIcon = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const CalendarIcon = (p) => <Icon {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 3v3M16 3v3" /></Icon>;
export const BarsIcon = (p) => <Icon {...p}><path d="M6 20v-6M12 20V8M18 20V4" /></Icon>;
export const TargetIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></Icon>;
export const DumbbellIcon = (p) => <Icon {...p}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></Icon>;
export const PlayIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m10.5 8.7 4.2 3.3-4.2 3.3z" fill="currentColor" /></Icon>;
export const DotsIcon = (p) => <Icon {...p}><circle cx="12" cy="5.5" r="1.1" fill="currentColor" /><circle cx="12" cy="12" r="1.1" fill="currentColor" /><circle cx="12" cy="18.5" r="1.1" fill="currentColor" /></Icon>;
export const CloseIcon = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const SendIcon = (p) => <Icon {...p}><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></Icon>;
export const SparkIcon = (p) => <Icon {...p}><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 16.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z" /></Icon>;
export const BellIcon = (p) => <Icon {...p}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></Icon>;
export const UserIcon = (p) => <Icon {...p}><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" /></Icon>;
