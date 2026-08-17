import { ReceptionShell } from "@/components/dashboard/reception/ReceptionShell";

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReceptionShell>{children}</ReceptionShell>;
}
