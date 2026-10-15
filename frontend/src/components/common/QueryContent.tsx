import type { ReactNode } from 'react'

import { Failure, Loading } from './Feedback'

export function QueryContent<T>({
  query,
  children,
}: {
  query: { data: T | undefined; error: Error | null; refetch: () => unknown }
  children: (data: T) => ReactNode
}) {
  if (query.error) {
    return <Failure error={query.error} retry={() => void query.refetch()} />
  }
  if (query.data === undefined) {
    return <Loading />
  }
  return children(query.data)
}
