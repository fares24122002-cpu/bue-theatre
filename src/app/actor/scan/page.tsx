import { Placeholder } from "@/components/Placeholder";

export default function ScanPage() {
  return (
    <Placeholder
      title="Scan to check in"
      description="Phone camera scanner for the session QR code. Marks the actor present, or late after the cutoff; refused after the session closes."
      design="'Actor: scan QR (phone)'"
    />
  );
}
