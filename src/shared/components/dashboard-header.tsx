'use client'

import React from 'react'
import { PanelLeft } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { SidebarTrigger } from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'

interface DashboardHeaderProps {
  parent?: string
  parentHref?: string
  path?: Array<{ label: string; href: string }>
  current: string
  onSidebarButtonClick?: () => void
}

export function DashboardHeader({
  parent,
  parentHref = '#',
  path,
  current,
  onSidebarButtonClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-4 bg-background px-4">
      {onSidebarButtonClick ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7')}
          onClick={onSidebarButtonClick}
        >
          <PanelLeft />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      ) : (
        <SidebarTrigger className="-ml-1" />
      )}

      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {parent && (
            <>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={parentHref}>{parent}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          {path &&
            path.map(item => (
              <React.Fragment key={item.label}>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </React.Fragment>
            ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{current}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
