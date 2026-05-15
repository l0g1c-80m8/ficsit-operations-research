'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map as MapIcon,
  Save as SaveIcon,
  BookOpen,
  Calculator,
  ClipboardList,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useGameData } from '@/lib/data/use-data';

const sections: { title: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'World',
    items: [
      { href: '/map', label: 'Map', icon: MapIcon },
      { href: '/save', label: 'Save File', icon: SaveIcon },
    ],
  },
  {
    title: 'Production',
    items: [
      { href: '/recipes', label: 'Recipes', icon: BookOpen },
      { href: '/calculator', label: 'Calculator', icon: Calculator },
      { href: '/planner', label: 'Planner', icon: ClipboardList },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data } = useGameData();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-ficsit-border bg-ficsit-panel transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-ficsit-border px-3">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-ficsit-accent font-mono text-sm font-bold text-black">
            F
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold uppercase tracking-wide">FICSIT</div>
              <div className="text-[10px] text-ficsit-subtle uppercase tracking-wider">Operations Research</div>
            </div>
          )}
        </Link>
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-ficsit-subtle hover:bg-ficsit-panel2 hover:text-ficsit-text"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-ficsit-accent/15 text-ficsit-accent'
                          : 'text-ficsit-text hover:bg-ficsit-panel2',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ficsit-border px-3 py-2 text-[10px] text-ficsit-subtle">
        {collapsed ? (
          <span title={data?.buildId ?? 'loading…'}>v0.1</span>
        ) : data ? (
          <div className="space-y-0.5" title={`build ${data.buildId ?? 'n/a'}`}>
            <div>FICSIT Inc. — Pioneer build v0.1</div>
            <div className="font-mono text-[9px] text-ficsit-accent/80">
              {data.recipes.length}r · {Object.keys(data.items).length}i · {Object.keys(data.buildings).length}b
            </div>
          </div>
        ) : (
          <div>loading dataset…</div>
        )}
      </div>
    </aside>
  );
}
