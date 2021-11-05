import { BigDecimal, BigInt, Address} from '@graphprotocol/graph-ts'
import { PIDie, PIDieBalance } from '../../generated/schema'
import { dayFromTimestamp } from './Dates';

export function loadOrCreatePIDieBalance(PIDie: PIDie, timestamp: BigInt): PIDieBalance{
    let id = timestamp.toString()+PIDie.id

    let PIDieBalance = PIDieBalance.load(id)
    if (PIDieBalance == null) {
        PIDieBalance = new PIDieBalance(id)
        PIDieBalance.PIDie = PIDie.id
        PIDieBalance.timestamp = timestamp
        PIDieBalance.sPIDBalance = BigDecimal.fromString("0")
        PIDieBalance.PIDBalance = BigDecimal.fromString("0")
        PIDieBalance.bondBalance = BigDecimal.fromString("0")
        PIDieBalance.dollarBalance = BigDecimal.fromString("0")
        PIDieBalance.stakes = []
        PIDieBalance.bonds = []
        PIDieBalance.save()
    }
    return PIDieBalance as PIDieBalance
}

