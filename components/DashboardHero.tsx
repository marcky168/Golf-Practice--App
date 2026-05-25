import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SkillFirstPicker } from "@/components/SkillFirstPicker";

/** Dashboard hero quick-start: skill-first picker (one tap into a session). */
export function DashboardHero({ loggedIn }: { loggedIn: boolean }) {
  if (!loggedIn) {
    return (
      <div className="text-center py-4">
        <Link href="/login">
          <Button size="lg" className="px-8 h-14 text-base">
            Log in to access practice tools
          </Button>
        </Link>
      </div>
    );
  }

  return <SkillFirstPicker variant="hero" />;
}
