'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

import { Label } from '@/shared/components/ui/label'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from '@/shared/components/ui/sidebar'

interface SearchFormProps extends React.ComponentProps<'form'> {
  onSearch?: (searchTerm: string) => void
  placeholder?: string
}

export function SearchForm({
  onSearch,
  placeholder,
  ...props
}: Readonly<SearchFormProps>) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  return (
    <form {...props} onSubmit={e => e.preventDefault()}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder={placeholder || 'Search...'}
            className="pl-8"
            value={searchTerm}
            onChange={handleSearch}
          />
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
