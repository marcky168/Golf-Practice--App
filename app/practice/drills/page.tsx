import { redirect } from "next/navigation";

/** Drill library lives inside Quick Block and Session Builder — keep old URL working */
export default function DrillLibraryRedirect() {
  redirect("/practice/block?mode=library");
}
