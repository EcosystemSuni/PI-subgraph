import {  DepositCall, RedeemCall  } from '../generated/FRAXBondV1/FRAXBondV1'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from "./utils/Transactions"
import { loadOrCreatePIDie, updatePIDieBalance } from "./utils/PIDie"
import { toDecimal } from "./utils/Decimals"
import { ETHBOND_TOKEN } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { createDailyBondRecord } from './utils/DailyBond'
import { getETHUSDRate } from './utils/Price'

export function handleDeposit(call: DepositCall): void {
  let PIDie = loadOrCreatePIDie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(ETHBOND_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.PIDie = PIDie.id
  deposit.amount = amount
  deposit.value = amount.times(getETHUSDRate())
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
  
  let redemption = Redemption.load(transaction.id)
  if (redemption==null){
    redemption = new Redemption(transaction.id)
  }
  redemption.transaction = transaction.id
  redemption.PIDie = PIDie.id
  redemption.token = loadOrCreateToken(ETHBOND_TOKEN).id;
  redemption.timestamp = transaction.timestamp;
  redemption.save()
  updatePIDieBalance(PIDie, transaction)
}