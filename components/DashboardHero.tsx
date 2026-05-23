import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shuffle, Award, Play, TrendingUp, Wrench } from "lucide-react";

/** Mobile-first quick start: Mixed is the hero CTA; other modes in a compact grid */
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
      {/* Primary — recommended mixed */}
      <Link href="/practice/mixed" className="group block">
        <Card className="golf-card border-2 border-primary-foreground/25 bg-card text-card-foreground shadow-lg active:scale-[0.985] transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
                Recommended
              </div>
              <div className="text-xl font-semibold text-foreground tracking-tight">
                Mixed Session
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Block warm-up + random main set — best transfer to the course.
              </p>
            </div>
            <Play className="h-8 w-8 text-primary shrink-0 opacity-80 group-hover:opacity-100" />
          </CardContent>
        </Card>
      </Link>

      {/* Secondary modes — 2×2 on mobile (card bg + foreground text for contrast on green hero) */}
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
