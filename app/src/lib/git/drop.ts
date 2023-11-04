import { rm, writeFile } from 'fs/promises'
import { Commit } from '../../models/commit'
import { IMultiCommitOperationProgress } from '../../models/progress'
import { Repository } from '../../models/repository'
import { getTempFilePath } from '../file-system'
import { getCommits } from './log'
import { RebaseResult, rebaseInteractive } from './rebase'
import { revRange } from './rev-list'
import { MultiCommitOperationKind } from '../../models/multi-commit-operation'

/**
 * Drops provided commits by calling interactive rebase.
 *
 * @param repository - The repository in which the commits will be dropped
 * @param toDrop - commits to drop
 * @param lastRetainedCommitRef - sha of commit before commits to drop or null
 * if base commit for drop is the root (first in history) of the branch
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress.
 */
export async function drop(
  repository: Repository,
  toDrop: ReadonlyArray<Commit>,
  lastRetainedCommitRef: string | null,
  progressCallback?: (progress: IMultiCommitOperationProgress) => void
): Promise<RebaseResult> {
  let todoPath
  let result: RebaseResult

  try {
    if (toDrop.length === 0) {
      throw new Error('[drop] No commits provided to drop.')
    }
    const toDropShas = new Set(toDrop.map(c => c.sha))

    const commits = await getCommits(
      repository,
      lastRetainedCommitRef === null
        ? undefined
        : revRange(lastRetainedCommitRef, 'HEAD')
    )

    if (commits.length === 0) {
      throw new Error(
        '[drop] Could not find commits in log for last retained commit ref.'
      )
    }

    todoPath = await getTempFilePath('dropTodo')
    const todoList: string[] = []

    for (const commit of commits) {
      if (toDropShas.has(commit.sha)) {
        todoList.unshift(`drop ${commit.sha} ${commit.summary}`)
      } else {
        todoList.unshift(`pick ${commit.sha} ${commit.summary}`)
      }
    }

    await writeFile(todoPath, todoList.join('\n'))

    result = await rebaseInteractive(
      repository,
      todoPath,
      lastRetainedCommitRef,
      MultiCommitOperationKind.Drop,
      undefined,
      progressCallback,
      commits
    )
  } catch (e) {
    log.error(e)
    return RebaseResult.Error
  } finally {
    if (todoPath !== undefined) {
      await rm(todoPath, { recursive: true, force: true })
    }
  }
  return result
}
