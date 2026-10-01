'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Flag,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  CalendarDays,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Inbox', icon: Inbox, count: 4 },
  { label: 'Today', icon: Sun, count: 3 },
  { label: 'Upcoming', icon: CalendarDays, count: 8 },
]
const projects = [
  { label: 'Personal', color: 'bg-violet-500' },
  { label: 'Work', color: 'bg-sky-500' },
  { label: 'Learning', color: 'bg-amber-500' },
]

export function TasklyDemo() {
  const [screen, setScreen] = useState<'login' | 'register' | 'app'>('login')
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <div className="min-h-screen bg-[#f8f9fb] text-[#1b1d22] transition-colors dark:bg-[#17191d] dark:text-[#f2f3f5]">
        <div className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full border border-black/[.08] bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#23262c]/90">
          <button aria-label="Light mode" onClick={() => setDark(false)} className={`rounded-full p-2 ${!dark ? 'bg-[#f0f1f3] text-[#202329] dark:bg-white/10' : 'text-[#9297a2]'}`}><Sun size={15} /></button>
          <button aria-label="Dark mode" onClick={() => setDark(true)} className={`rounded-full p-2 ${dark ? 'bg-[#343942] text-white' : 'text-[#9297a2]'}`}><Moon size={15} /></button>
        </div>

        {screen === 'app' ? (
          <AppShell dark={dark} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setScreen={setScreen} />
        ) : (
          <AuthScreen mode={screen} setMode={setScreen} onContinue={() => setScreen('app')} dark={dark} />
        )}
      </div>
    </div>
  )
}

function AuthScreen({ mode, setMode, onContinue, dark }: { mode: 'login' | 'register'; setMode: (mode: 'login' | 'register' | 'app') => void; onContinue: () => void; dark: boolean }) {
  const register = mode === 'register'
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-20 sm:px-8">
      <section className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#6957d9] text-white shadow-[0_5px_16px_rgba(105,87,217,.25)]"><Check size={23} strokeWidth={2.8} /></div>
          <h1 className="text-[25px] font-semibold tracking-[-.03em]">{register ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-[14px] text-[#747985] dark:text-[#9da2ad]">{register ? 'Start organizing the work that matters.' : 'Sign in to continue to Taskly.'}</p>
        </div>
        <div className="rounded-2xl border border-black/[.08] bg-white p-7 shadow-[0_12px_40px_rgba(23,28,45,.06)] dark:border-white/10 dark:bg-[#202328] dark:shadow-none sm:p-8">
          <button onClick={onContinue} className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dfe1e6] bg-white text-[14px] font-medium text-[#31343a] transition hover:bg-[#f7f7f8] dark:border-white/10 dark:bg-[#292c32] dark:text-[#f1f2f4] dark:hover:bg-[#30343b]"><GoogleIcon /> Continue with Google</button>
          <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[.12em] text-[#a1a5ae]"><span className="h-px flex-1 bg-[#e8e9ec] dark:bg-white/10" />or<span className="h-px flex-1 bg-[#e8e9ec] dark:bg-white/10" /></div>
          <form onSubmit={(e) => { e.preventDefault(); onContinue() }} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Email</span><input type="email" placeholder="you@example.com" className="h-11 w-full rounded-lg border border-[#dfe1e6] bg-white px-3.5 text-[14px] outline-none transition placeholder:text-[#a4a8b1] focus:border-[#6957d9] focus:ring-2 focus:ring-[#6957d9]/15 dark:border-white/10 dark:bg-[#292c32] dark:placeholder:text-[#777d88]" /></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Password</span><input type="password" placeholder="••••••••" className="h-11 w-full rounded-lg border border-[#dfe1e6] bg-white px-3.5 text-[14px] outline-none transition placeholder:text-[#a4a8b1] focus:border-[#6957d9] focus:ring-2 focus:ring-[#6957d9]/15 dark:border-white/10 dark:bg-[#292c32] dark:placeholder:text-[#777d88]" /></label>
            {register && <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Confirm password</span><input type="password" placeholder="••••••••" className="h-11 w-full rounded-lg border border-[#dfe1e6] bg-white px-3.5 text-[14px] outline-none transition placeholder:text-[#a4a8b1] focus:border-[#6957d9] focus:ring-2 focus:ring-[#6957d9]/15 dark:border-white/10 dark:bg-[#292c32] dark:placeholder:text-[#777d88]" /></label>}
            <button type="submit" className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#6957d9] text-[14px] font-medium text-white shadow-[0_4px_10px_rgba(105,87,217,.2)] transition hover:bg-[#5d4bcf]">{register ? 'Create account' : 'Log in'}<ArrowRight size={16} /></button>
          </form>
        </div>
        <p className="mt-6 text-center text-[13px] text-[#777c87] dark:text-[#9da2ad]">{register ? 'Already have an account?' : "Don't have an account?"}{' '}<button onClick={() => setMode(register ? 'login' : 'register')} className="font-medium text-[#6957d9] hover:underline">{register ? 'Log in' : 'Create one'}</button></p>
      </section>
    </main>
  )
}

function AppShell({ dark, sidebarOpen, setSidebarOpen, setScreen }: { dark: boolean; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; setScreen: (v: 'login' | 'register' | 'app') => void }) {
  return <div className="flex min-h-screen">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col border-r border-[#e6e7ea] bg-white px-3 py-4 transition-transform dark:border-white/[.08] dark:bg-[#202328] md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-3 pb-7"><div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6957d9] text-white"><Check size={15} strokeWidth={3} /></div><span className="text-[15px] font-semibold tracking-[-.02em]">taskly</span></div><button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-[#9297a2] hover:bg-[#f2f3f5] md:hidden"><X size={18}/></button></div>
      <button className="mb-5 flex h-10 items-center gap-2 rounded-lg bg-[#6957d9] px-3 text-[13px] font-medium text-white shadow-[0_4px_10px_rgba(105,87,217,.18)]"><Plus size={17}/> Add task <span className="ml-auto text-[11px] text-white/60">N</span></button>
      <nav className="space-y-1">{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] ${label === 'Inbox' ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]' : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span><span className="ml-auto text-[12px] text-[#a0a4ad]">{count}</span></button>)}</nav>
      <div className="mt-8"><div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-[#9da1aa]">Projects<button aria-label="Add project" className="rounded p-0.5 hover:bg-[#f0f1f3]"><Plus size={14}/></button></div>{projects.map(({ label, color }) => <button key={label} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5"><span className={`h-2 w-2 rounded-full ${color}`}/>{label}</button>)}</div>
      <div className="mt-auto space-y-1 border-t border-[#ececef] pt-3 dark:border-white/[.08]"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-[#656b77] dark:text-[#aeb3bd]"><Settings size={17} strokeWidth={1.8}/> Settings</button><button onClick={() => setScreen('login')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-[#656b77] dark:text-[#aeb3bd]"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9d3ff] text-[10px] font-semibold text-[#5948c7]">AM</div><span>Alex Morgan</span><ChevronDown className="ml-auto" size={14}/></button></div>
    </aside>
    <main className="min-w-0 flex-1"><header className="flex h-[68px] items-center justify-between border-b border-[#e8e9ec] bg-white/80 px-5 backdrop-blur dark:border-white/[.08] dark:bg-[#17191d]/80 sm:px-8"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#707580] hover:bg-[#f0f1f3] md:hidden"><Menu size={20}/></button><button className="flex items-center gap-2 rounded-lg border border-[#e3e4e8] px-3 py-2 text-[13px] text-[#767b86] hover:bg-[#f7f7f8] dark:border-white/10 dark:text-[#aeb3bd]"><Search size={16}/> <span className="hidden sm:inline">Search tasks</span><kbd className="ml-2 hidden rounded border border-[#e5e6e9] px-1.5 py-0.5 text-[10px] sm:inline dark:border-white/10">⌘ K</kbd></button></div><div className="flex items-center gap-2"><button aria-label="Notifications" className="rounded-lg p-2 text-[#777c87] hover:bg-[#f1f2f4]"><Sparkles size={17}/></button><div className="hidden h-5 w-px bg-[#e5e6e9] dark:bg-white/10 sm:block"/><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9d3ff] text-[11px] font-semibold text-[#5948c7]">AM</div></div></header>
      <section className="mx-auto max-w-[920px] px-5 py-8 sm:px-8 sm:py-11"><div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-[12px] font-medium uppercase tracking-[.12em] text-[#9b9fa8]">Tuesday, September 24</p><h2 className="text-[25px] font-semibold tracking-[-.03em]">Inbox</h2></div><div className="flex items-center gap-1 rounded-lg border border-[#e4e5e8] p-1 dark:border-white/10"><button className="rounded-md bg-[#f0f1f3] p-1.5 text-[#33363c] dark:bg-white/10 dark:text-white"><List size={16}/></button><button className="p-1.5 text-[#999da6]"><LayoutGrid size={16}/></button></div></div><div className="space-y-0 rounded-xl border border-[#e7e8eb] bg-white shadow-[0_5px_18px_rgba(23,28,45,.03)] dark:border-white/[.08] dark:bg-[#202328] dark:shadow-none"><Task title="Review Q3 project notes" meta="Today · Work" priority="P1"/><Task title="Plan the week ahead" meta="Today · Personal" priority="P2"/><Task title="Read 10 pages of current book" meta="Tomorrow · Learning" priority="P3"/><Task title="Book dentist appointment" meta="Friday · Personal" priority="P4" done/></div><button className="mt-5 flex items-center gap-2 px-2 text-[13px] font-medium text-[#8a8f99] hover:text-[#6957d9]"><Plus size={16}/> Add task</button></section>
    </main>
  </div>
}

function Task({ title, meta, priority, done }: { title: string; meta: string; priority: string; done?: boolean }) { return <div className={`group flex items-center gap-3 border-b border-[#eef0f2] px-4 py-3.5 last:border-0 dark:border-white/[.07] ${done ? 'opacity-55' : ''}`}><button aria-label={`Mark ${title} complete`} className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-[#6957d9] bg-[#6957d9] text-white' : 'border-[#c9ccd3] hover:border-[#6957d9]'}`}>{done && <Check size={11} strokeWidth={3}/>}</button><div className="min-w-0 flex-1"><p className={`truncate text-[14px] ${done ? 'line-through' : ''}`}>{title}</p><p className="mt-1 text-[11px] text-[#a0a4ad]">{meta}</p></div><span className={`text-[11px] font-semibold ${priority === 'P1' ? 'text-[#e15d62]' : priority === 'P2' ? 'text-[#e0913e]' : priority === 'P3' ? 'text-[#5e94d7]' : 'text-[#9ba0a9]'}`}><Flag size={13} className="mr-1 inline"/> {priority}</span><button aria-label={`More options for ${title}`} className="hidden rounded p-1 text-[#a0a4ad] hover:bg-[#f2f3f5] group-hover:block">•••</button></div> }

function GoogleIcon() { return <span className="text-[15px] font-bold" aria-hidden="true">G</span> }

export { AppShell }

