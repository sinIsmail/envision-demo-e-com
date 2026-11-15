import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Globe, ExternalLink, Flame, GitBranch } from "lucide-react";

export function DeveloperTab() {
  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Developer & System Info
        </h2>
        <p className="text-xs text-muted-foreground">
          Live deployment endpoints, database sync, and version control links.
        </p>
      </div>

      {/* ── System Diagnostics & Environment ── */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>System Diagnostics & Environment</CardTitle>
          </div>
          <CardDescription>
            Live deployment endpoints, database sync, and version control links.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" /> Firebase Project
                </span>
                <Badge variant="outline" className="text-[10px]">Production</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono">envision-demo-com</p>
              <a
                href="https://console.firebase.google.com/project/envision-demo-com/overview"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                Open Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-500" /> Production URL
                </span>
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Live</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono truncate">envision-demo-com.web.app</p>
              <a
                href="https://envision-demo-com.web.app"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                Visit Site <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-purple-500" /> Git Repository
                </span>
                <Badge variant="outline" className="text-[10px]">GitHub</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono truncate">sinIsmail/envision-demo-e-com</p>
              <a
                href="https://github.com/sinIsmail/envision-demo-e-com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                View Repository <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
