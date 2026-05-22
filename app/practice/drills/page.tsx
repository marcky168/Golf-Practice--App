"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { BlockDrillLibraryList } from "@/components/practice/BlockDrillLibraryList";
import { BLOCK_DRILL_LIBRARY, getDrillPresetAvailability } from "@/lib/practice/block-drills";
import { getClubBag, type ClubEntry } from "@/app/actions";
import { toast } from "sonner";

export default function DrillLibraryPage() {
  const router = useRouter();
  const [userBag, setUserBag] = useState<ClubEntry[]>([]);
  const [bagLoading, setBagLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getClubBag().then(bag => {
      setUserBag(bag);
      setBagLoading(false);
    });
  }, []);

  function startDrill(id: string) {
    const preset = BLOCK_DRILL_LIBRARY.find(d => d.id === id);
    if (!preset) return;
    const { available } = getDrillPresetAvailability(preset, userBag);
    if (!available) {
      toast.error("Add the required clubs on your Profile to run this drill.");
      return;
    }
    router.push(`/practice/builder?mode=library&drill=${id}`);
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Practice
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tighter">Block Drill Library</h1>
      </div>
      <p className="text-muted-foreground mb-4">
        Pre-built block sessions — load into the builder or run from{" "}
        <Link href="/practice/block" className="underline text-primary">Block Practice</Link>.
      </p>

      {userBag.length === 0 && !bagLoading && (
        <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3 mb-6">
          Add clubs on your{" "}
          <Link href="/profile" className="underline text-primary">Profile</Link>{" "}
          so drills use your real bag.
        </p>
      )}

      <BlockDrillLibraryList
        userBag={userBag}
        bagLoading={bagLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStart={startDrill}
      />

      <p className="text-center text-xs text-muted-foreground mt-8">
        Want a one-off block? Use{" "}
        <Link href="/practice/block" className="underline">Block Practice</Link>{" "}
        or the{" "}
        <Link href="/practice/builder" className="underline">Practice Builder</Link>.
      </p>
    </div>
  );
}
