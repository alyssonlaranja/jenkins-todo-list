'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { TFunction } from 'i18next'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bot,
  CheckSquare,
  Globe,
  GraduationCap,
  Mail,
  Network,
  RefreshCcw,
  Settings,
  Sliders,
  Wand2,
  Workflow,
  Wrench,
} from 'lucide-react'

import type { ModuleId } from '@/features/module-config/types'
import { SearchForm } from '@/shared/components/search-form'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/shared/components/ui/sidebar'
import { useI18n } from '@/shared/hooks/use-i18n'
import { useModuleAccessV2 as useModuleAccess } from '@/shared/session/hooks/use-module-access-v2'

// Type definitions for menu structure
interface MenuItem {
  title: string
  url: string
  icon: React.ReactNode
  disabled?: boolean
  moduleId: ModuleId // Module identifier for access control
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

interface FilteredMenuGroup extends MenuGroup {
  hidden: boolean
}

interface MenuData {
  navMain: MenuGroup[]
}

// Constants
const DASHBOARD_URL = '/dashboard'

// Menu data structure
const getMenuData = (t: TFunction<'mcp'>): MenuData => ({
  navMain: [
    {
      title: t('sidebar.groups.setup'),
      items: [
        {
          title: t('sidebar.setup.environments'),
          url: `${DASHBOARD_URL}/environments`,
          icon: <Settings className="size-4" />,
          moduleId: 'environments',
        },
        {
          title: t('sidebar.setup.connections'),
          url: `${DASHBOARD_URL}/connections`,
          icon: <Network className="size-4" />,
          moduleId: 'connections',
        },
      ],
    },
    {
      title: t('sidebar.groups.operations'),
      items: [
        {
          title: t('sidebar.operations.migration'),
          url: `${DASHBOARD_URL}/migration`,
          icon: <RefreshCcw className="size-4" />,
          moduleId: 'migration',
        },
        {
          title: t('sidebar.operations.migrationWizard'),
          url: `${DASHBOARD_URL}/migration-wizard`,
          icon: <Wand2 className="size-4" />,
          moduleId: 'migrationWizard',
        },
        {
          title: t('sidebar.operations.upstream'),
          url: `${DASHBOARD_URL}/upstream`,
          icon: <ArrowUpCircle className="size-4" />,
          moduleId: 'upstream',
        },
        {
          title: t('sidebar.operations.downstream'),
          url: `${DASHBOARD_URL}/downstream`,
          icon: <ArrowDownCircle className="size-4" />,
          moduleId: 'downstream',
        },
        {
          title: t('sidebar.operations.atlas'),
          url: `${DASHBOARD_URL}/atlas`,
          icon: <Globe className="size-4" />,
          moduleId: 'atlas',
        },
      ],
    },
    {
      title: t('sidebar.groups.personal'),
      items: [
        {
          title: t('sidebar.personal.myTasks'),
          url: `${DASHBOARD_URL}/my-tasks`,
          icon: <CheckSquare className="size-4" />,
          moduleId: 'myTasks',
        },
      ],
    },
    {
      title: t('sidebar.groups.communication'),
      items: [
        {
          title: t('sidebar.communication.messages'),
          url: `${DASHBOARD_URL}/messages`,
          icon: <Mail className="size-4" />,
          moduleId: 'messages',
        },
      ],
    },
    {
      title: t('sidebar.groups.admin'),
      items: [
        {
          title: t('sidebar.admin.onboarding'),
          url: `${DASHBOARD_URL}/onboarding`,
          icon: <GraduationCap className="size-4" />,
          moduleId: 'onboarding',
        },
        {
          title: t('sidebar.admin.moduleConfig'),
          url: `${DASHBOARD_URL}/module-config`,
          icon: <Sliders className="size-4" />,
          moduleId: 'moduleConfig',
        },
        {
          title: t('sidebar.admin.devTools', 'DevTools'),
          url: `${DASHBOARD_URL}/dev-tools`,
          icon: <Wrench className="size-4" />,
          moduleId: 'devTools',
        },
        {
          title: t(
            'sidebar.admin.supervisorPlayground',
            'Supervisor Playground'
          ),
          url: `${DASHBOARD_URL}/supervisor-playground`,
          icon: <Bot className="size-4" />,
          moduleId: 'supervisorPlayground',
        },
        {
          title: t('sidebar.admin.canvasPlayground', 'Canvas Playground'),
          url: `${DASHBOARD_URL}/canvas-playground`,
          icon: <Workflow className="size-4" />,
          moduleId: 'canvasPlayground',
        },
      ],
    },
  ],
})

type SidebarProps = React.ComponentProps<typeof Sidebar>

/**
 * AppSidebar component - Main navigation sidebar for the application
 *
 * Provides navigation to Setup (Environments, Connections) and
 * Operations (Migration, Upstream) sections.
 *
 * Module access is controlled by:
 * 1. License-level MCP artifacts (LICENSE_MODULE_CONFIG_*)
 * 2. Namespace-level MCP artifacts (NAMESPACE_MODULE_CONFIG_*)
 * 3. User role verification
 */
export function AppSidebar(props: SidebarProps): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const pathname = usePathname()
  const { t } = useI18n('mcp')
  const { isModuleAccessible } = useModuleAccess()

  const menuData = useMemo(() => getMenuData(t as TFunction<'mcp'>), [t])

  // Filter menu items based on module access (license + namespace + role)
  const accessFilteredMenu = useMemo<MenuGroup[]>(() => {
    return menuData.navMain
      .map(group => ({
        ...group,
        items: group.items.filter(item => isModuleAccessible(item.moduleId)),
      }))
      .filter(group => group.items.length > 0) // Remove empty groups
  }, [menuData.navMain, isModuleAccessible])

  // Memoize filtered menu to prevent unnecessary recalculations (search filtering)
  const filteredMenu = useMemo<FilteredMenuGroup[]>(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim()
    if (!normalizedSearchTerm) {
      return accessFilteredMenu.map(group => ({ ...group, hidden: false }))
    }

    const result: FilteredMenuGroup[] = []
    for (const group of accessFilteredMenu) {
      const filteredItems = group.items.filter(item =>
        item.title.toLowerCase().includes(normalizedSearchTerm)
      )

      if (filteredItems.length > 0) {
        result.push({ ...group, items: filteredItems, hidden: false })
      }
    }
    return result
  }, [searchTerm, accessFilteredMenu])

  // Check if there are no search results
  const hasNoSearchResults = useMemo<boolean>(
    () => searchTerm.trim() !== '' && filteredMenu.every(item => item.hidden),
    [searchTerm, filteredMenu]
  )

  // Handle search input changes
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  // Render regular menu item
  const renderMenuItem = (item: MenuItem) => {
    // Handle disabled items - render without link
    if (item.disabled) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            tooltip={isCollapsed ? item.title : undefined}
            className="!h-auto cursor-not-allowed !overflow-visible opacity-50 [&>span:last-child]:!text-clip [&>span:last-child]:!whitespace-normal"
            disabled
          >
            <div
              className={`flex w-full text-sm ${isCollapsed ? 'h-10 justify-center' : 'min-h-10 items-start py-2'}`}
            >
              <span className={`shrink-0 ${isCollapsed ? '' : 'mr-2 pt-0.5'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="whitespace-normal break-words">
                  {item.title}
                </span>
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={pathname === item.url}
          tooltip={isCollapsed ? item.title : undefined}
          className="!h-auto !overflow-visible [&>span:last-child]:!text-clip [&>span:last-child]:!whitespace-normal"
        >
          <Link
            href={item.url}
            className={`flex w-full text-sm ${isCollapsed ? 'h-10 justify-center' : 'min-h-10 items-start py-2'}`}
          >
            <span className={`shrink-0 ${isCollapsed ? '' : 'mr-2 pt-0.5'}`}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="whitespace-normal break-words">
                {item.title}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  // Render menu group
  const renderMenuGroup = (group: FilteredMenuGroup) =>
    !group.hidden && (
      <SidebarGroup key={group.title}>
        {!isCollapsed && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map(item => renderMenuItem(item))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <div className="flex h-full flex-col">
        <SidebarHeader className="shrink-0 pt-4">
          {!isCollapsed && <SearchForm onSearch={handleSearch} />}
        </SidebarHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-130px)]">
            <SidebarContent className="pt-0">
              {hasNoSearchResults
                ? !isCollapsed && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      {t('sidebar.search.noResults', { term: searchTerm })}
                    </div>
                  )
                : filteredMenu.map(renderMenuGroup)}
            </SidebarContent>
          </ScrollArea>
        </div>
        <SidebarRail />
      </div>
    </Sidebar>
  )
}
