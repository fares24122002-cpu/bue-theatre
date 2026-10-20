import { after } from "next/server";
import { flushNotificationEmails } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";

/**
 * Call at the end of any Server Action that can create notifications. The
 * emails go out after the response, so the page does not wait for them.
 */
export async function queueNotificationEmails(): Promise<void> {
  const siteUrl = await getSiteUrl();
  after(() => flushNotificationEmails(siteUrl));
}
