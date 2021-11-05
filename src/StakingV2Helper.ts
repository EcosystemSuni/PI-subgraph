import { Address } from '@graphprotocol/graph-ts'
import { Stake, Unstake } from '../generated/schema'

import {  StakeCall  } from '../generated/OlympusStakingV2Helper/OlympusStakingV2Helper'
import { toDecimal } from "./utils/Decimals"
import { loadOrCreatePIDie, updatePIDieBalance } from "./utils/PIDie"
import { loadOrCreateTransaction } from "./utils/Transactions"

export function handleStake(call: StakeCall): void {
    let PIDie = loadOrCreatePIDie(call.from as Address)
    let transaction = loadOrCreateTransaction(call.transaction, call.block)
    let value = toDecimal(call.inputs._amount, 9)

    let stake = new Stake(transaction.id)
    stake.transaction = transaction.id
    stake.PIDie = PIDie.id
    stake.amount = value
    stake.timestamp = transaction.timestamp;
    stake.save()

    updatePIDieBalance(PIDie, transaction)
}