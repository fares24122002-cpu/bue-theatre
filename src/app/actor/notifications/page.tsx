import type { Metadata } from "next";
import { NotificationList } from "@/components/NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="container narrow">
      <h1 className="display page-title">Notifications</h1>
      <NotificationList />
    </div>
  );
}
