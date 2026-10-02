import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { guidedTreeApi, treeLanguagesApi } from '@/lib/endpoints'
import type { GuidedTreeNode } from '@/types/api'

/**
 * The tenant's guided question tree as an end user walks it: the language,
 * the path tapped so far, and the options at the current level.
 */
export function useGuidedTree() {
  const [language, setLanguage] = useState<string | undefined>(undefined) // undefined = canonical
  const [path, setPath] = useState<GuidedTreeNode[]>([])

  const languages = useQuery({
    queryKey: ['tree-languages'],
    queryFn: () => treeLanguagesApi.list(true),
  })
  const treeQuery = useQuery({
    queryKey: ['guided-tree', language ?? ''],
    queryFn: () => guidedTreeApi.tree(language),
  })

  useEffect(() => setPath([]), [language])

  const tree = treeQuery.data?.tree ?? []
  const current = path[path.length - 1] ?? null
  const canonical = treeQuery.data?.canonical_language
  return {
    // A tenant without a tree never sees the guided mode (the canonical tree is the source).
    hasTree: tree.length > 0 || language !== undefined,
    language: treeQuery.data?.language ?? canonical,
    canonical,
    languages: languages.data ?? [],
    setLanguage: (code: string) => setLanguage(code === canonical ? undefined : code),
    options: current ? current.children : tree,
    atRoot: path.length === 0,
    pick: (node: GuidedTreeNode) => setPath((p) => [...p, node]),
    home: () => setPath([]),
  }
}
