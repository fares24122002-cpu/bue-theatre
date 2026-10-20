import { redirect } from "next/navigation";

export default async function Page({ params }: PageProps<"/shows/[id]">) {
  const { id } = await params;
  redirect(/^[0-9a-f-]{36}$/i.test(id) ? `/#show-${id}` : "/#shows");
}
