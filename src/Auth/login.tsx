import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center p-6 md:p-10 bg-slate-50 dark:bg-[#0A0A0A] overflow-hidden">
      {/* Hyper-Saturated Fluid ambient background glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#FDE047]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link
          to={'/'}
          className="inline-flex items-center gap-2 self-center rounded-full bg-white/80 dark:bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs hover:scale-105 active:scale-95 transition-all text-slate-800 dark:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Back to Store
        </Link>
        <LoginForm />
      </div>
    </div>
  )
}
