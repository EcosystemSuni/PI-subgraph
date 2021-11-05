import { Address } from '@graphprotocol/graph-ts'

import {  DepositCall, RedeemCall  } from '../generated/DAIBondV3/DAIBondV3'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from "./utils/Transactions"
import { loadOrCreatePIDie, updatePIDieBalance } from "./utils/PIDie"
import { toDecimal } from "./utils/Decimals"
import { DAIBOND_TOKEN } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { loadOrCreateRedemption } from './utils/Redemption'
import { createDailyBondRecord } from './utils/DailyBond'


export function handleDeposit(call: DepositCall): void {
  let PIDie = loadOrCreatePIDie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(DAIBOND_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.PIDie = PIDie.id
  deposit.amount = amount
  deposit.value = amount
  deposit.maxPremium = toDecimal(call.inputs._maxPrice)
  deposit.token = token.id;
  deposit.timestamp = transaction.timestamp;
  deposit.save()

  createDailyBondRecord(deposit.timestamp, token, deposit.amount, deposit.value)
  updatePIDieBalance(PIDie, transaction)
}

export function handleRedeem(call: RedeemCall): void {
  let PIDie = loadOrCreatePIDie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  
  let redemption = loadOrCreateRedemption(call.transaction.hash as Address)
  redemption.transaction = transaction.id
  redemption.PIDie = PIDie.id
  redemption.token = loadOrCreateToken(DAIBOND_TOKEN).id;
  redemption.timestamp = transaction.timestamp;
  redemption.save()
  updatePIDieBalance(PIDie, transaction)
}