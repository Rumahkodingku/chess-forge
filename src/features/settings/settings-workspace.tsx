"use client";

import {
  Cpu,
  FlaskConical,
  HardDrive,
  MonitorCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StoragePanel } from "@/components/shared/storage-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyMotionPreference } from "@/features/settings/motion-preference";
import {
  type ApplicationSettings,
  ASPECT_PRESETS,
  applicationSettingsSchema,
  DEFAULT_SETTINGS,
} from "@/features/settings/types";
import {
  exportApplicationBackup,
  importApplicationBackup,
} from "@/features/storage/backup";
import {
  createSettingsRepository,
  openChessForgeDatabase,
} from "@/features/storage/db";
import { useStorageStatus } from "@/features/storage/use-storage-status";
import { useBrowserCapabilities } from "@/lib/browser-capabilities";

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-medium text-muted-foreground"
    >
      {children}
    </label>
  );
}

function CapabilityRow({
  label,
  supported,
  detail,
}: {
  label: string;
  supported: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div>
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {detail}
        </p>
      </div>
      <span className="shrink-0 rounded border border-border/80 px-2 py-1 text-[10px] text-muted-foreground">
        {supported ? "Available" : "Unavailable"}
      </span>
    </li>
  );
}

export function SettingsWorkspace() {
  const [settings, setSettings] =
    useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);
  const { requestPersistence } = useStorageStatus();
  const capabilities = useBrowserCapabilities();
  const engineUsesTime = settings.enginePreferences.movetimeMs !== undefined;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await openChessForgeDatabase();
        const stored = await createSettingsRepository(db).get();
        if (!cancelled) {
          setSettings(stored ?? DEFAULT_SETTINGS);
          setSaveState("idle");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Settings could not be loaded.",
          );
          setSaveState("error");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === "#storage") {
      setActiveTab("storage");
    }
  }, []);

  function update(patch: Partial<ApplicationSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setSaveState("idle");
  }

  function updateEngine(
    patch: Partial<ApplicationSettings["enginePreferences"]>,
  ) {
    setSettings((current) => ({
      ...current,
      enginePreferences: { ...current.enginePreferences, ...patch },
    }));
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    setError(null);
    try {
      const parsed = applicationSettingsSchema.parse(settings);
      const db = await openChessForgeDatabase();
      await createSettingsRepository(db).save(parsed);
      setSettings(parsed);
      applyMotionPreference(parsed);
      setSaveState("saved");
      toast.success("Settings saved to this device.");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (saveError) {
      setSaveState("error");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Settings could not be saved.",
      );
      toast.error("Settings could not be saved.");
    }
  }

  async function persist() {
    const granted = await requestPersistence();
    toast.success(
      granted
        ? "Persistent storage granted."
        : "The browser did not grant persistent storage.",
    );
  }

  async function exportBackup() {
    try {
      const blob = await exportApplicationBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chessforge-backup-${new Date().toISOString().slice(0, 10)}.chessforge.zip`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Backup exported.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Backup export failed.",
      );
    }
  }

  async function importBackup(file: File) {
    if (
      !window.confirm(
        "Importing this backup overwrites games, projects, templates, settings, and Library data in this browser. Continue?",
      )
    ) {
      return;
    }
    try {
      const summary = await importApplicationBackup(file);
      toast.success(
        `Backup restored from ${new Date(summary.createdAt).toLocaleString()}.`,
      );
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Backup import failed.",
      );
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto border border-border/80 bg-surface-1 p-1 sm:w-auto">
        <TabsTrigger value="general" className="flex-none px-3">
          General
        </TabsTrigger>
        <TabsTrigger value="engine" className="flex-none px-3">
          Engine
        </TabsTrigger>
        <TabsTrigger value="storage" className="flex-none px-3">
          Storage
        </TabsTrigger>
        <TabsTrigger value="about" className="flex-none px-3">
          About
        </TabsTrigger>
      </TabsList>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] text-destructive"
        >
          {error}
        </div>
      ) : null}

      <TabsContent value="general" className="space-y-5">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="text-[15px]">Appearance</CardTitle>
            <CardDescription>
              These defaults apply to new projects. Existing projects keep their
              own overrides.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="board-theme">Board theme</FieldLabel>
              <Select
                value={settings.boardTheme}
                onValueChange={(value) => update({ boardTheme: value })}
              >
                <SelectTrigger id="board-theme" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forge">Forge (dark)</SelectItem>
                  <SelectItem value="classic">Classic wood</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="piece-theme">Piece set</FieldLabel>
              <Select
                value={settings.pieceTheme}
                onValueChange={(value) => update({ pieceTheme: value })}
              >
                <SelectTrigger id="piece-theme" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cburnett">cburnett</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="aspect-ratio">
                Default aspect ratio
              </FieldLabel>
              <Select
                value={settings.defaultAspectRatio}
                onValueChange={(value) => {
                  const aspect = value as keyof typeof ASPECT_PRESETS;
                  const preset = ASPECT_PRESETS[aspect];
                  update({
                    defaultAspectRatio: aspect,
                    defaultCanvas: {
                      aspectRatio: aspect,
                      width: preset.width,
                      height: preset.height,
                    },
                  });
                }}
              >
                <SelectTrigger id="aspect-ratio" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 portrait</SelectItem>
                  <SelectItem value="16:9">16:9 landscape</SelectItem>
                  <SelectItem value="1:1">1:1 square</SelectItem>
                  <SelectItem value="4:5">4:5 portrait feed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="resolution">Default resolution</FieldLabel>
              <Select
                value={settings.defaultResolution}
                onValueChange={(value) =>
                  update({
                    defaultResolution:
                      value as ApplicationSettings["defaultResolution"],
                  })
                }
              >
                <SelectTrigger id="resolution" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="frame-rate">Default frame rate</FieldLabel>
              <Select
                value={String(settings.defaultFrameRate)}
                onValueChange={(value) =>
                  update({ defaultFrameRate: Number(value) as 30 | 60 })
                }
              >
                <SelectTrigger id="frame-rate" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-border/80 px-3 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={settings.motionPreferences.reducedMotion}
                onChange={(event) =>
                  update({
                    motionPreferences: {
                      reducedMotion: event.target.checked,
                    },
                  })
                }
                className="size-4 accent-[var(--brand)]"
              />
              Reduce interface motion
            </label>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="text-[15px]">Player names</CardTitle>
            <CardDescription>
              Chess Library uses these names to identify your side in imported
              games. Matching is case-insensitive. Ambiguous games stay unknown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {settings.playerNames.length ? (
                settings.playerNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      update({
                        playerNames: settings.playerNames.filter(
                          (item) => item !== name,
                        ),
                      })
                    }
                    className="rounded-full border border-border/80 bg-surface-2 px-2.5 py-1 text-[11px] text-foreground hover:border-destructive/50 hover:text-destructive"
                    aria-label={`Remove player name ${name}`}
                  >
                    {name} ×
                  </button>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No player names yet.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={playerNameInput}
                onChange={(event) => setPlayerNameInput(event.target.value)}
                placeholder="Your Chess.com or Lichess name"
                aria-label="Add player name"
                className="h-10"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 border-border/80 bg-transparent px-3"
                onClick={() => {
                  const name = playerNameInput.trim();
                  if (!name) return;
                  if (
                    settings.playerNames.some(
                      (item) => item.toLowerCase() === name.toLowerCase(),
                    )
                  ) {
                    setPlayerNameInput("");
                    return;
                  }
                  update({
                    playerNames: [...settings.playerNames, name].slice(0, 20),
                  });
                  setPlayerNameInput("");
                }}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={save}
            disabled={saveState === "saving"}
            className="h-10 px-4"
          >
            {saveState === "saving" ? "Saving" : "Save settings"}
          </Button>
          <Button
            variant="outline"
            className="h-10 border-border/80 bg-transparent px-4"
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              setSaveState("idle");
              toast.message("Defaults restored in the form. Save to persist.");
            }}
          >
            Restore defaults
          </Button>
          <span
            aria-live="polite"
            className="text-[11px] text-muted-foreground"
          >
            {saveState === "saved" ? "Saved to IndexedDB." : null}
          </span>
        </div>
      </TabsContent>

      <TabsContent value="engine" className="space-y-5">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Cpu aria-hidden className="size-4 text-brand" />
              Stockfish defaults
            </CardTitle>
            <CardDescription>
              R3 keeps one single-threaded worker. Conservative defaults keep
              the interface responsive.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-limit">Analysis limit</FieldLabel>
              <Select
                value={engineUsesTime ? "time" : "depth"}
                onValueChange={(value) =>
                  updateEngine(
                    value === "time"
                      ? {
                          movetimeMs:
                            settings.enginePreferences.movetimeMs ?? 2000,
                          depth: undefined,
                        }
                      : {
                          depth: settings.enginePreferences.depth ?? 14,
                          movetimeMs: undefined,
                        },
                  )
                }
              >
                <SelectTrigger id="engine-limit" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depth">Depth</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-depth">Depth</FieldLabel>
              <Input
                id="engine-depth"
                type="number"
                min={6}
                max={30}
                value={settings.enginePreferences.depth ?? 14}
                disabled={engineUsesTime}
                onChange={(event) =>
                  updateEngine({ depth: Number(event.target.value) })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-movetime">Time limit (ms)</FieldLabel>
              <Input
                id="engine-movetime"
                type="number"
                min={250}
                max={30_000}
                step={250}
                value={settings.enginePreferences.movetimeMs ?? 2000}
                disabled={!engineUsesTime}
                onChange={(event) =>
                  updateEngine({ movetimeMs: Number(event.target.value) })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-multipv">
                Principal variations
              </FieldLabel>
              <Input
                id="engine-multipv"
                type="number"
                min={1}
                max={8}
                value={settings.enginePreferences.multiPv}
                onChange={(event) =>
                  updateEngine({ multiPv: Number(event.target.value) })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-hash">Hash size (MB)</FieldLabel>
              <Input
                id="engine-hash"
                type="number"
                min={16}
                max={512}
                step={16}
                value={settings.enginePreferences.hashMb}
                onChange={(event) =>
                  updateEngine({ hashMb: Number(event.target.value) })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="engine-threads">Threads</FieldLabel>
              <Input
                id="engine-threads"
                type="number"
                value={1}
                disabled
                className="h-10"
              />
              <p className="text-[10px] text-muted-foreground">
                R3 uses the single-thread build. Multi-thread stays deferred.
              </p>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="evaluation-perspective">
                Evaluation perspective
              </FieldLabel>
              <Select
                value={settings.evaluationPerspective}
                onValueChange={(value) =>
                  update({
                    evaluationPerspective: value as "white" | "side-to-move",
                  })
                }
              >
                <SelectTrigger
                  id="evaluation-perspective"
                  className="h-10 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White perspective</SelectItem>
                  <SelectItem value="side-to-move">Side to move</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={save}
          disabled={saveState === "saving"}
          className="h-10 px-4"
        >
          {saveState === "saving" ? "Saving" : "Save engine settings"}
        </Button>
      </TabsContent>

      <TabsContent value="storage" className="space-y-5">
        <div id="storage" className="scroll-mt-24">
          <StoragePanel compact />
        </div>
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <HardDrive aria-hidden className="size-4 text-brand" />
              Storage controls
            </CardTitle>
            <CardDescription>
              IndexedDB holds games, analysis, projects, templates, and uploaded
              audio. The browser may clear it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10 border-border/80 bg-transparent px-4"
                onClick={() => void persist()}
              >
                Request persistent storage
              </Button>
              <Button
                type="button"
                className="h-10 px-4"
                onClick={() => void exportBackup()}
              >
                Export backup
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-border/80 bg-transparent px-4"
                onClick={() => backupInputRef.current?.click()}
              >
                Import backup
              </Button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".zip,.chessforge,application/zip"
                className="sr-only"
                aria-label="Import ChessForge backup"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importBackup(file);
                }}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Persistent storage is a browser grant, not a guarantee. Export a
              backup before clearing site data or changing devices. The backup
              includes games, analysis, projects, templates, assets, settings,
              notes, repertoire, and learning progress.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="about" className="space-y-5">
        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <MonitorCheck aria-hidden className="size-4 text-brand" />
              Browser capabilities
            </CardTitle>
            <CardDescription>
              Feature detection is read from this browser at runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul>
              <CapabilityRow
                label="Web Worker"
                supported={capabilities.webWorker}
                detail="Runs Stockfish and other CPU-heavy work outside the interface thread."
              />
              <CapabilityRow
                label="WebCodecs"
                supported={capabilities.webCodecs}
                detail="Encodes the video stream during export. Codec support varies."
              />
              <CapabilityRow
                label="File System Access"
                supported={capabilities.fileSystemAccess}
                detail="Allows large exports to stream directly to a chosen file."
              />
              <CapabilityRow
                label="IndexedDB"
                supported={capabilities.indexedDb}
                detail="Stores games, projects, templates, and settings locally."
              />
              <CapabilityRow
                label="Storage estimate"
                supported={capabilities.storageEstimate}
                detail="Reports how much browser storage this workspace uses."
              />
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <FlaskConical aria-hidden className="size-4 text-brand" />
              Technical labs
            </CardTitle>
            <CardDescription>
              R0 proof pages. They are not part of the daily workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <Button
              asChild
              variant="outline"
              className="h-10 justify-start border-border/80 bg-transparent"
            >
              <Link href="/labs/export">Export proof</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 justify-start border-border/80 bg-transparent"
            >
              <Link href="/labs/engine">Engine proof</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 justify-start border-border/80 bg-transparent"
            >
              <Link href="/labs/pgn">PGN parser</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <ShieldCheck aria-hidden className="size-4 text-brand" />
              Licences and data
            </CardTitle>
            <CardDescription>
              The source of truth is `docs/THIRD_PARTY_NOTICES.md` in the
              repository.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
            <p>Stockfish: GPL-3.0. Chessground: GPL-3.0-or-later.</p>
            <p>Remotion: rendered under the free individual licence.</p>
            <p>cburnett pieces: CC BY-SA 3.0 with attribution.</p>
            <p>chess-openings: CC0 1.0. Geist fonts: OFL.</p>
            <Separator className="my-2" />
            <p>
              No account, no cloud project, and no PGN, analysis, or project
              upload. External requests are limited to game import services.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
