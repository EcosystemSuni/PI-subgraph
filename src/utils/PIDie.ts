import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { PIDie, Transaction } from '../../generated/schema'
import { OlympusERC20 } from '../../generated/DAIBondV1/OlympusERC20'
import { sOlympusERC20 } from '../../generated/DAIBondV1/sOlympusERC20'
import { sOlympusERC20V2 } from '../../generated/DAIBondV1/sOlympusERC20V2'
import { DAIBondV1 } from '../../generated/DAIBondV1/DAIBondV1'
import { DAIBondV2 } from '../../generated/DAIBondV1/DAIBondV2'
import { DAIBondV3 } from '../../generated/DAIBondV1/DAIBondV3'
import { PIDDAIBondV1 } from '../../generated/DAIBondV1/PIDDAIBondV1'
import { PIDDAIBondV2 } from '../../generated/DAIBondV1/PIDDAIBondV2'
import { PIDDAIBondV3 } from '../../generated/DAIBondV1/PIDDAIBondV3'
import { PIDDAIBondV4 } from '../../generated/DAIBondV1/PIDDAIBondV4'
import { PIDFRAXBondV1 } from '../../generated/DAIBondV1/PIDFRAXBondV1'
import { PIDFRAXBondV2 } from '../../generated/DAIBondV1/PIDFRAXBondV2'
import { FRAXBondV1 } from '../../generated/DAIBondV1/FRAXBondV1'
import { ETHBondV1 } from '../../generated/DAIBondV1/ETHBondV1'

import { DAIBOND_CONTRACTS1, DAIBOND_CONTRACTS1_BLOCK, DAIBOND_CONTRACTS2, DAIBOND_CONTRACTS2_BLOCK, DAIBOND_CONTRACTS3, DAIBOND_CONTRACTS3_BLOCK, ETHBOND_CONTRACT1, ETHBOND_CONTRACT1_BLOCK, FRAXBOND_CONTRACT1, FRAXBOND_CONTRACT1_BLOCK, PIDDAISLPBOND_CONTRACT1, PIDDAISLPBOND_CONTRACT1_BLOCK, PIDDAISLPBOND_CONTRACT2, PIDDAISLPBOND_CONTRACT2_BLOCK, PIDDAISLPBOND_CONTRACT3, PIDDAISLPBOND_CONTRACT3_BLOCK, PIDDAISLPBOND_CONTRACT4, PIDDAISLPBOND_CONTRACT4_BLOCK, PIDFRAXLPBOND_CONTRACT1, PIDFRAXLPBOND_CONTRACT1_BLOCK, PIDFRAXLPBOND_CONTRACT2, PIDFRAXLPBOND_CONTRACT2_BLOCK, PID_ERC20_CONTRACT, SPID_ERC20_CONTRACT, SPID_ERC20_CONTRACTV2, SPID_ERC20_CONTRACTV2_BLOCK } from '../utils/Constants'
import { loadOrCreatePIDieBalance } from './PIDieBalances'
import { toDecimal } from './Decimals'
import { getPIDUSDRate } from './Price'
import { loadOrCreateContractInfo } from './ContractInfo'
import { getHolderAux } from './Aux'

export function loadOrCreatePIDie(addres: Address): PIDie{
    let PIDie = PIDie.load(addres.toHex())
    if (PIDie == null) {
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()

        PIDie = new PIDie(addres.toHex())
        PIDie.active = true
        PIDie.save()
    }
    return PIDie as PIDie
}

export function updatePIDieBalance(PIDie: PIDie, transaction: Transaction): void{

    let balance = loadOrCreatePIDieBalance(PIDie, transaction.timestamp)

    let PID_contract = OlympusERC20.bind(Address.fromString(PID_ERC20_CONTRACT))
    let sPID_contract = sOlympusERC20.bind(Address.fromString(SPID_ERC20_CONTRACT))
    balance.PIDBalance = toDecimal(PID_contract.balanceOf(Address.fromString(PIDie.id)), 9)
    let sPIDV1Balance = toDecimal(sPID_contract.balanceOf(Address.fromString(PIDie.id)), 9)
    balance.sPIDBalance = sPIDV1Balance

    let stakes = balance.stakes

    let cinfoSPIDBalance_v1 = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "sOlympusERC20")
    cinfoSPIDBalance_v1.name = "sPID"
    cinfoSPIDBalance_v1.contract = SPID_ERC20_CONTRACT
    cinfoSPIDBalance_v1.amount = sPIDV1Balance
    cinfoSPIDBalance_v1.save()
    stakes.push(cinfoSPIDBalance_v1.id)

    if(transaction.blockNumber.gt(BigInt.fromString(SPID_ERC20_CONTRACTV2_BLOCK))){
        let sPID_contract_v2 = sOlympusERC20V2.bind(Address.fromString(SPID_ERC20_CONTRACTV2))
        let sPIDV2Balance = toDecimal(sPID_contract_v2.balanceOf(Address.fromString(PIDie.id)), 9)
        balance.sPIDBalance = balance.sPIDBalance.plus(sPIDV2Balance)

        let cinfoSPIDBalance_v2 = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "sOlympusERC20V2")
        cinfoSPIDBalance_v2.name = "sPID"
        cinfoSPIDBalance_v2.contract = SPID_ERC20_CONTRACTV2
        cinfoSPIDBalance_v2.amount = sPIDV2Balance
        cinfoSPIDBalance_v2.save()
        stakes.push(cinfoSPIDBalance_v2.id)
    }

    balance.stakes = stakes

    if(PIDie.active && balance.PIDBalance.lt(BigDecimal.fromString("0.01")) && balance.sPIDBalance.lt(BigDecimal.fromString("0.01"))){
        let holders = getHolderAux()
        holders.value = holders.value.minus(BigInt.fromI32(1))
        holders.save()
        PIDie.active = false
    }
    else if(PIDie.active==false && (balance.PIDBalance.gt(BigDecimal.fromString("0.01")) || balance.sPIDBalance.gt(BigDecimal.fromString("0.01")))){
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()
        PIDie.active = true
    }

    //PID-DAI
    let bonds = balance.bonds
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT1_BLOCK))){
        let bondPIDDai_contract = PIDDAIBondV1.bind(Address.fromString(PIDDAISLPBOND_CONTRACT1))
        let pending = bondPIDDai_contract.getDepositorInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDDAIBondV1")
            binfo.name = "PID-DAI"
            binfo.contract = PIDDAISLPBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending PIDDAIBondV1 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT2_BLOCK))){
        let bondPIDDai_contract = PIDDAIBondV2.bind(Address.fromString(PIDDAISLPBOND_CONTRACT2))
        let pending = bondPIDDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDDAIBondV2")
            binfo.name = "PID-DAI"
            binfo.contract = PIDDAISLPBOND_CONTRACT2
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)
            
            log.debug("PIDie {} pending PIDDAIBondV2 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT3_BLOCK))){
        let bondPIDDai_contract = PIDDAIBondV3.bind(Address.fromString(PIDDAISLPBOND_CONTRACT3))
        let pending = bondPIDDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDDAIBondV3")
            binfo.name = "PID-DAI"
            binfo.contract = PIDDAISLPBOND_CONTRACT3
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending PIDDAIBondV3 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDDAISLPBOND_CONTRACT4_BLOCK))){
        let bondPIDDai_contract = PIDDAIBondV4.bind(Address.fromString(PIDDAISLPBOND_CONTRACT4))
        let pending = bondPIDDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDDAIBondV4")
            binfo.name = "PID-DAI"
            binfo.contract = PIDDAISLPBOND_CONTRACT4
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending PIDDAIBondV4 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //DAI
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS1_BLOCK))){
        let bondDai_contract = DAIBondV1.bind(Address.fromString(DAIBOND_CONTRACTS1))
        let pending = bondDai_contract.getDepositorInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "DAIBondV1")
            binfo.name = "DAI"
            binfo.contract = DAIBOND_CONTRACTS1
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending DAIBondV1 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS2_BLOCK))){
        let bondDai_contract = DAIBondV2.bind(Address.fromString(DAIBOND_CONTRACTS2))
        let pending = bondDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "DAIBondV2")
            binfo.name = "DAI"
            binfo.contract = DAIBOND_CONTRACTS2
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending DAIBondV2 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS3_BLOCK))){
        let bondDai_contract = DAIBondV3.bind(Address.fromString(DAIBOND_CONTRACTS3))
        let pending = bondDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "DAIBondV3")
            binfo.name = "DAI"
            binfo.contract = DAIBOND_CONTRACTS3
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending DAIBondV3 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //PID-FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(PIDFRAXLPBOND_CONTRACT1_BLOCK))){
        let bondFRAXDai_contract = PIDFRAXBondV1.bind(Address.fromString(PIDFRAXLPBOND_CONTRACT1))
        let pending = bondFRAXDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDFRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = PIDFRAXLPBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending PIDFRAXBondV1 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    if(transaction.blockNumber.gt(BigInt.fromString(PIDFRAXLPBOND_CONTRACT2_BLOCK))){
        let bondFRAXDai_contract = PIDFRAXBondV2.bind(Address.fromString(PIDFRAXLPBOND_CONTRACT2))
        let pending = bondFRAXDai_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "PIDFRAXBondV2")
            binfo.name = "DAI"
            binfo.contract = PIDFRAXLPBOND_CONTRACT2
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending PIDFRAXBondV2 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT1_BLOCK))){
        let bondFRAX_contract = FRAXBondV1.bind(Address.fromString(FRAXBOND_CONTRACT1))
        let pending = bondFRAX_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "FRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = FRAXBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending FRAXBondV1 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //WETH
    if(transaction.blockNumber.gt(BigInt.fromString(ETHBOND_CONTRACT1_BLOCK))){
        let bondETH_contract = ETHBondV1.bind(Address.fromString(ETHBOND_CONTRACT1))
        let pending = bondETH_contract.bondInfo(Address.fromString(PIDie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(PIDie.id + transaction.timestamp.toString() + "FRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = FRAXBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("PIDie {} pending ETHBondV1 V1 {} on tx {}", [PIDie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    balance.bonds = bonds

    //TODO add LUSD and PIDLUSD

    //Price
    let usdRate = getPIDUSDRate()
    balance.dollarBalance = balance.PIDBalance.times(usdRate).plus(balance.sPIDBalance.times(usdRate)).plus(balance.bondBalance.times(usdRate))
    balance.save()

    PIDie.lastBalance = balance.id;
    PIDie.save()
}