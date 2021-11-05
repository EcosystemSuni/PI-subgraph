import { Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'
import { PIDDAIBondV1 } from '../../generated/PIDDAIBondV1/PIDDAIBondV1';
import { PIDDAIBondV2 } from '../../generated/PIDDAIBondV1/PIDDAIBondV2';
import { PIDDAIBondV3 } from '../../generated/PIDDAIBondV1/PIDDAIBondV3';
import { PIDDAIBondV4 } from '../../generated/PIDDAIBondV1/PIDDAIBondV4';
import { DAIBondV1 } from '../../generated/DAIBondV1/DAIBondV1';
import { DAIBondV2 } from '../../generated/DAIBondV1/DAIBondV2';
import { DAIBondV3 } from '../../generated/DAIBondV1/DAIBondV3';
import { PIDFRAXBondV1 } from '../../generated/PIDFRAXBondV1/PIDFRAXBondV1';
import { PIDFRAXBondV2 } from '../../generated/PIDFRAXBondV2/PIDFRAXBondV2';
import { FRAXBondV1 } from '../../generated/FRAXBondV1/FRAXBondV1';
import { ETHBondV1 } from '../../generated/ETHBondV1/ETHBondV1';
import { LUSDBondV1 } from '../../generated/LUSDBondV1/LUSDBondV1';
import { PIDLUSDBondV1 } from '../../generated/PIDLUSDBondV1/PIDLUSDBondV1';

import { BondDiscount, Transaction } from '../../generated/schema'
import { DAIBOND_CONTRACTS1, DAIBOND_CONTRACTS1_BLOCK, DAIBOND_CONTRACTS2, DAIBOND_CONTRACTS2_BLOCK, DAIBOND_CONTRACTS3, DAIBOND_CONTRACTS3_BLOCK, ETHBOND_CONTRACT1, ETHBOND_CONTRACT1_BLOCK, FRAXBOND_CONTRACT1, FRAXBOND_CONTRACT1_BLOCK, LUSDBOND_CONTRACT1, LUSDBOND_CONTRACT1_BLOCK, PIDDAISLPBOND_CONTRACT1, PIDDAISLPBOND_CONTRACT1_BLOCK, PIDDAISLPBOND_CONTRACT2, PIDDAISLPBOND_CONTRACT2_BLOCK, PIDDAISLPBOND_CONTRACT3, PIDDAISLPBOND_CONTRACT3_BLOCK, PIDDAISLPBOND_CONTRACT4, PIDDAISLPBOND_CONTRACT4_BLOCK, PIDFRAXLPBOND_CONTRACT1, PIDFRAXLPBOND_CONTRACT1_BLOCK, PIDFRAXLPBOND_CONTRACT2, PIDFRAXLPBOND_CONTRACT2_BLOCK, PIDLUSDBOND_CONTRACT1, PIDLUSDBOND_CONTRACT1_BLOCK } from './Constants';
import { hourFromTimestamp } from './Dates';
import { toDecimal } from './Decimals';
import { getPIDUSDRate } from './Price';

export function loadOrCreateBondDiscount(timestamp: BigInt): BondDiscount{
    let hourTimestamp = hourFromTimestamp(timestamp);

    let bondDiscount = BondDiscount.load(hourTimestamp)
    if (bondDiscount == null) {
        bondDiscount = new BondDiscount(hourTimestamp)
        bondDiscount.timestamp = timestamp
        bondDiscount.dai_discount  = BigDecimal.fromString("0")
        bondDiscount.PIDdai_discount = BigDecimal.fromString("0")
        bondDiscount.frax_discount = BigDecimal.fromString("0")
        bondDiscount.PIDfrax_discount = BigDecimal.fromString("0")
        bondDiscount.eth_discount = BigDecimal.fromString("0")
        bondDiscount.lusd_discount = BigDecimal.fromString("0")
        bondDiscount.PIDlusd_discount = BigDecimal.fromString("0")
        bondDiscount.save()
    }
    return bondDiscount as BondDiscount
}

export function updateBondDiscounts(transaction: Transaction): void{
    let bd = loadOrCreateBondDiscount(transaction.timestamp);
    let PIDRate = getPIDUSDRate();

    //PIDDAI
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT1_BLOCK))){
        let bond = PIDDAIBondV1.bind(Address.fromString(PIDDAISLPBOND_CONTRACT1))
        //bd.PIDdai_discount = PIDRate.div(toDecimal(bond.bondPriceInUSD(), 18)).minus(BigDecimal.fromString("1")).times(BigDecimal.fromString("100"))
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT2_BLOCK))){
        let bond = PIDDAIBondV2.bind(Address.fromString(PIDDAISLPBOND_CONTRACT2))
        //bd.PIDdai_discount = PIDRate.div(toDecimal(bond.bondPriceInUSD(), 18)).minus(BigDecimal.fromString("1")).times(BigDecimal.fromString("100"))
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT3_BLOCK))){
        let bond = PIDDAIBondV3.bind(Address.fromString(PIDDAISLPBOND_CONTRACT3))
        //bd.PIDdai_discount = PIDRate.div(toDecimal(bond.bondPriceInUSD(), 18)).minus(BigDecimal.fromString("1")).times(BigDecimal.fromString("100"))
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT4_BLOCK))){
        let bond = PIDDAIBondV4.bind(Address.fromString(PIDDAISLPBOND_CONTRACT4))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.PIDdai_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.PIDdai_discount = bd.PIDdai_discount.minus(BigDecimal.fromString("1"))
            bd.PIDdai_discount = bd.PIDdai_discount.times(BigDecimal.fromString("100"))
            log.debug("PIDDAI Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }

    //DAI
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS1_BLOCK))){
        let bond = DAIBondV1.bind(Address.fromString(DAIBOND_CONTRACTS1))
        //bd.dai_discount = PIDRate.div(toDecimal(bond.bondPriceInUSD(), 18)).minus(BigDecimal.fromString("1")).times(BigDecimal.fromString("100"))
    }
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS2_BLOCK))){
        let bond = DAIBondV2.bind(Address.fromString(DAIBOND_CONTRACTS2))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.dai_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.dai_discount = bd.dai_discount.minus(BigDecimal.fromString("1"))
            bd.dai_discount = bd.dai_discount.times(BigDecimal.fromString("100"))
            log.debug("DAI Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }    
    }
    
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS3_BLOCK))){
        let bond = DAIBondV3.bind(Address.fromString(DAIBOND_CONTRACTS3))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.dai_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.dai_discount = bd.dai_discount.minus(BigDecimal.fromString("1"))
            bd.dai_discount = bd.dai_discount.times(BigDecimal.fromString("100"))
            log.debug("DAI Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }    
    }

    //PIDFRAX
    if(transaction.blockNumber.gt(BigInt.fromString(PIDFRAXLPBOND_CONTRACT1_BLOCK))){
        let bond = PIDFRAXBondV1.bind(Address.fromString(PIDFRAXLPBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.PIDfrax_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.PIDfrax_discount = bd.PIDfrax_discount.minus(BigDecimal.fromString("1"))
            bd.PIDfrax_discount = bd.PIDfrax_discount.times(BigDecimal.fromString("100"))
            log.debug("PIDFRAX Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDFRAXLPBOND_CONTRACT2_BLOCK))){
        let bond = PIDFRAXBondV2.bind(Address.fromString(PIDFRAXLPBOND_CONTRACT2))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.PIDfrax_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.PIDfrax_discount = bd.PIDfrax_discount.minus(BigDecimal.fromString("1"))
            bd.PIDfrax_discount = bd.PIDfrax_discount.times(BigDecimal.fromString("100"))
            log.debug("PIDFRAX Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }

    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT1_BLOCK))){
        let bond = FRAXBondV1.bind(Address.fromString(FRAXBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.frax_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.frax_discount = bd.frax_discount.minus(BigDecimal.fromString("1"))
            bd.frax_discount = bd.frax_discount.times(BigDecimal.fromString("100"))
            log.debug("FRAX Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }

    //ETH
    if(transaction.blockNumber.gt(BigInt.fromString(ETHBOND_CONTRACT1_BLOCK))){
        let bond = ETHBondV1.bind(Address.fromString(ETHBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.eth_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.eth_discount = bd.eth_discount.minus(BigDecimal.fromString("1"))
            bd.eth_discount = bd.eth_discount.times(BigDecimal.fromString("100"))
            log.debug("ETH Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }

    //LUSD
    if(transaction.blockNumber.gt(BigInt.fromString(LUSDBOND_CONTRACT1_BLOCK))){
        let bond = LUSDBondV1.bind(Address.fromString(LUSDBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.lusd_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.lusd_discount = bd.lusd_discount.minus(BigDecimal.fromString("1"))
            bd.lusd_discount = bd.lusd_discount.times(BigDecimal.fromString("100"))
            log.debug("LUSD Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }

    //PIDLUSD
    if(transaction.blockNumber.gt(BigInt.fromString(PIDLUSDBOND_CONTRACT1_BLOCK))){
        let bond = PIDLUSDBondV1.bind(Address.fromString(PIDLUSDBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.PIDlusd_discount = PIDRate.div(toDecimal(price_call.value, 18))
            bd.PIDlusd_discount = bd.PIDlusd_discount.minus(BigDecimal.fromString("1"))
            bd.PIDlusd_discount = bd.PIDlusd_discount.times(BigDecimal.fromString("100"))
            log.debug("PIDLUSD Discount PID price {}  Bond Price {}  Discount {}", [PIDRate.toString(), price_call.value.toString(), bd.PIDfrax_discount.toString()])
        }
    }
    
    bd.save()
}