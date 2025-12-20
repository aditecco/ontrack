export function VersionInfo() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
  const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown";

  return (
    <div className="flex justify-center items-center gap-2">
      <span className="text-muted-foreground">v{version}</span>
      <span className="text-muted-foreground/50">•</span>
      <span className="font-mono text-muted-foreground">{commitHash}</span>
    </div>
  );
}
