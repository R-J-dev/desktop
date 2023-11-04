import { MultiCommitOperationKind } from '../../models/multi-commit-operation'
import { BaseRebase } from './base-rebase'

export abstract class Drop extends BaseRebase {
  protected conflictDialogOperationPrefix = 'dropping commits on'
  protected rebaseKind = MultiCommitOperationKind.Drop

  protected onBeginOperation = () => {
    const { repository, dispatcher, state } = this.props
    const { operationDetail } = state

    if (operationDetail.kind !== MultiCommitOperationKind.Drop) {
      this.endFlowInvalidState()
      return
    }

    const { commits, lastRetainedCommitRef } = operationDetail

    return dispatcher.dropCommits(
      repository,
      commits,
      lastRetainedCommitRef,
      true
    )
  }
}
