import { Address } from '@graphprotocol/graph-ts'
import { Stake, Unstake } from '../generated/schema'

import {  StakePIDCall, UnstakePIDCall  } from '../generated/OlympusStakingV1/OlympusStakingV1'
import { toDecimal } from "./utils/Decimals"
import { loadOrCreatePIDie, updatePIDieBalance } from "./utils/PIDie"
import { loadOrCreateTransaction } from "./utils/Transactions"
import { updateProtocolMetrics } from './utils/ProtocolMetrics'

export function handleStake(call: StakePIDCall): void {
    let PIDie = loadOrCreatePIDie(call.from as Address)
    let transaction = loadOrCreateTransaction(call.transaction, call.block)
    let value = toDecimal(call.inputs.amountToStake_, 9)

    let stake = new Stake(transaction.id)
    stake.transaction = transaction.id
    stake.PIDie = PIDie.id
    stake.amount = value
    stake.timestamp = transaction.timestamp;
    stake.save()

    updatePIDieBalance(PIDie, transaction)
    updateProtocolMetrics(transaction)
}

export function handleUnstake(call: UnstakePIDCall): void {
    let PIDie = loadOrCreatePIDie(call.from as Address)
    let transaction = loadOrCreateTransaction(call.transaction, call.block)
    let value = toDecimal(call.inputs.amountToWithdraw_, 9)

    let unstake = new Unstake(transaction.id)
    unstake.transaction = transaction.id
    unstake.PIDie = PIDie.id
    unstake.amount = value
    unstake.timestamp = transaction.timestamp;
    unstake.save()

    updatePIDieBalance(PIDie, transaction)
    updateProtocolMetrics(transaction)
}