'use client'

import { useRouter } from 'next/navigation'
import { ShieldX } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

interface UnauthorizedMessageProps {
  moduleId?: string
  moduleName?: string
  requiredRole?: string
}

export function UnauthorizedMessage({
  moduleId,
  moduleName,
  requiredRole,
}: UnauthorizedMessageProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="size-8 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access{' '}
            {moduleName || moduleId || 'this module'}.
            {requiredRole && (
              <span className="mt-1 block">
                Required role: <strong>{requiredRole}</strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => router.push('/sda')}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  )
}
