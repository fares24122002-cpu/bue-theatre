import { redirect } from "next/navigation";

/** The public site is one landing page now; old links lead there. */
export default function Page() {
  redirect("/");
}
