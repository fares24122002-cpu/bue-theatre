import { logout } from "@/app/actions/auth";
import { getCurrentProfile } from "@/lib/auth";

/** Shows who is logged in and a log out button. Place inside <Suspense>. */
export async function UserMenu() {
  const profile = await getCurrentProfile();

  return (
    <>
      {profile ? <span className="user-name">{profile.full_name}</span> : null}
      <form action={logout}>
        <button type="submit">Log out</button>
      </form>
    </>
  );
}
