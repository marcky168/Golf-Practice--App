import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shuffle, Award, Wrench } from "lucide-react";

/** Mobile-first quick start: 2×2 grid of practice modes */
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <Link href="/practice/builder" className="group">
          <Card className="golf-card h-full border border-primary-foreground/20 shadow-md bg-card text-card-foreground active:scale-[0.985] transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base text-foreground">Practice Builder</CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                Custom or drill library
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/random" className="group">
          <Card className="golf-card h-full border border-primary-foreground/20 shadow-md bg-card text-card-foreground active:scale-[0.985] transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-2">
                <Shuffle className="w-5 h-5 text-accent" />
              </div>
              <CardTitle className="text-base text-foreground">Random Practice</CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                Interleaved drills
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/block" className="group">
          <Card className="golf-card h-full border border-primary-foreground/20 shadow-md bg-card text-card-foreground active:scale-[0.985] transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base text-foreground">Block Practice</CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                Deep repetition
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/games" className="group">
          <Card className="golf-card h-full border border-primary-foreground/20 shadow-md bg-card text-card-foreground active:scale-[0.985] transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-2">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <CardTitle className="text-base text-foreground">Games &amp; Challenges</CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                Pressure challenges
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
