import { Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'
import { OlympusERC20 } from '../../generated/OlympusStakingV1/OlympusERC20';
import { sOlympusERC20 } from '../../generated/OlympusStakingV1/sOlympusERC20';
import { sOlympusERC20V2 } from '../../generated/OlympusStakingV1/sOlympusERC20V2';
import { CirculatingSupply } from '../../generated/OlympusStakingV1/CirculatingSupply';
import { ERC20 } from '../../generated/OlympusStakingV1/ERC20';
import { UniswapV2Pair } from '../../generated/OlympusStakingV1/UniswapV2Pair';
import { MasterChef } from '../../generated/OlympusStakingV1/MasterChef';
import { OlympusStakingV2 } from '../../generated/OlympusStakingV2/OlympusStakingV2';
import { OlympusStakingV1 } from '../../generated/OlympusStakingV1/OlympusStakingV1';
import { ConvexAllocator } from '../../generated/OlympusStakingV1/ConvexAllocator';

import { ProtocolMetric, Transaction } from '../../generated/schema'
import { AAVE_ALLOCATOR, ADAI_ERC20_CONTRACT, CIRCULATING_SUPPLY_CONTRACT, CIRCULATING_SUPPLY_CONTRACT_BLOCK, CONVEX_ALLOCATOR1, CONVEX_ALLOCATOR1_BLOCK, CONVEX_ALLOCATOR2, CONVEX_ALLOCATOR2_BLOCK, ERC20DAI_CONTRACT, ERC20FRAX_CONTRACT, LUSDBOND_CONTRACT1_BLOCK, LUSD_ERC20_CONTRACT, LUSD_ERC20_CONTRACTV2_BLOCK, PIDDAI_ONSEN_ID, PID_ERC20_CONTRACT, ONSEN_ALLOCATOR, SPID_ERC20_CONTRACT, SPID_ERC20_CONTRACTV2, SPID_ERC20_CONTRACTV2_BLOCK, STAKING_CONTRACT_V1, STAKING_CONTRACT_V2, STAKING_CONTRACT_V2_BLOCK, SUSHI_MASTERCHEF, SUSHI_PIDDAI_PAIR, SUSHI_PIDLUSD_PAIR, TREASURY_ADDRESS, TREASURY_ADDRESS_V2, TREASURY_ADDRESS_V2_BLOCK, UNI_PIDFRAX_PAIR, UNI_PIDFRAX_PAIR_BLOCK, UNI_PIDLUSD_PAIR_BLOCK, WETH_ERC20_CONTRACT, XSUSI_ERC20_CONTRACT } from './Constants';
import { dayFromTimestamp } from './Dates';
import { toDecimal } from './Decimals';
import { getPIDUSDRate, getDiscountedPairUSD, getPairUSD, getXsushiUSDRate, getETHUSDRate } from './Price';
import { getHolderAux } from './Aux';
import { updateBondDiscounts } from './BondDiscounts';

export function loadOrCreateProtocolMetric(timestamp: BigInt): ProtocolMetric{
    let dayTimestamp = dayFromTimestamp(timestamp);

    let protocolMetric = ProtocolMetric.load(dayTimestamp)
    if (protocolMetric == null) {
        protocolMetric = new ProtocolMetric(dayTimestamp)
        protocolMetric.timestamp = timestamp
        protocolMetric.PIDCirculatingSupply = BigDecimal.fromString("0")
        protocolMetric.sPIDCirculatingSupply = BigDecimal.fromString("0")
        protocolMetric.totalSupply = BigDecimal.fromString("0")
        protocolMetric.PIDPrice = BigDecimal.fromString("0")
        protocolMetric.marketCap = BigDecimal.fromString("0")
        protocolMetric.totalValueLocked = BigDecimal.fromString("0")
        protocolMetric.treasuryRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryMarketValue = BigDecimal.fromString("0")
        protocolMetric.nextEpochRebase = BigDecimal.fromString("0")
        protocolMetric.nextDistributedPID = BigDecimal.fromString("0")
        protocolMetric.currentAPY = BigDecimal.fromString("0")
        protocolMetric.treasuryDaiRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryFraxRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryLusdRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryDaiMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryFraxMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryLusdMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryXsushiMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryWETHMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryPIDDaiPOL = BigDecimal.fromString("0")
        protocolMetric.treasuryPIDFraxPOL = BigDecimal.fromString("0")
        protocolMetric.treasuryPIDLusdPOL = BigDecimal.fromString("0")
        protocolMetric.holders = BigInt.fromI32(0)

        protocolMetric.save()
    }
    return protocolMetric as ProtocolMetric
}


function getTotalSupply(): BigDecimal{
    let PID_contract = OlympusERC20.bind(Address.fromString(PID_ERC20_CONTRACT))
    let total_supply = toDecimal(PID_contract.totalSupply(), 9)
    log.debug("Total Supply {}", [total_supply.toString()])
    return total_supply
}

function getCriculatingSupply(transaction: Transaction, total_supply: BigDecimal): BigDecimal{
    let circ_supply = BigDecimal.fromString("0")
    if(transaction.blockNumber.gt(BigInt.fromString(CIRCULATING_SUPPLY_CONTRACT_BLOCK))){
        let circulatingsupply_contract = CirculatingSupply.bind(Address.fromString(CIRCULATING_SUPPLY_CONTRACT))
        circ_supply = toDecimal(circulatingsupply_contract.PIDCirculatingSupply(), 9)
    }
    else{
        circ_supply = total_supply;
    }
    log.debug("Circulating Supply {}", [total_supply.toString()])
    return circ_supply
}

function getSPIDSupply(transaction: Transaction): BigDecimal{
    let sPID_supply = BigDecimal.fromString("0")

    let sPID_contract_v1 = sOlympusERC20.bind(Address.fromString(SPID_ERC20_CONTRACT))
    sPID_supply = toDecimal(sPID_contract_v1.circulatingSupply(), 9)
    
    if(transaction.blockNumber.gt(BigInt.fromString(SPID_ERC20_CONTRACTV2_BLOCK))){
        let sPID_contract_v2 = sOlympusERC20V2.bind(Address.fromString(SPID_ERC20_CONTRACTV2))
        sPID_supply = sPID_supply.plus(toDecimal(sPID_contract_v2.circulatingSupply(), 9))
    }
    
    log.debug("sPID Supply {}", [sPID_supply.toString()])
    return sPID_supply
}

function getMV_RFV(transaction: Transaction): BigDecimal[]{
    let daiERC20 = ERC20.bind(Address.fromString(ERC20DAI_CONTRACT))
    let fraxERC20 = ERC20.bind(Address.fromString(ERC20FRAX_CONTRACT))
    let aDaiERC20 = ERC20.bind(Address.fromString(ADAI_ERC20_CONTRACT))
    let xSushiERC20 = ERC20.bind(Address.fromString(XSUSI_ERC20_CONTRACT))
    let wethERC20 = ERC20.bind(Address.fromString(WETH_ERC20_CONTRACT))
    let lusdERC20 = ERC20.bind(Address.fromString(LUSD_ERC20_CONTRACT))

    let PIDdaiPair = UniswapV2Pair.bind(Address.fromString(SUSHI_PIDDAI_PAIR))
    let PIDdaiOnsenMC = MasterChef.bind(Address.fromString(SUSHI_MASTERCHEF))
    let PIDfraxPair = UniswapV2Pair.bind(Address.fromString(UNI_PIDFRAX_PAIR))
    let PIDlusdPair = UniswapV2Pair.bind(Address.fromString(SUSHI_PIDLUSD_PAIR))

    let treasury_address = TREASURY_ADDRESS;
    if(transaction.blockNumber.gt(BigInt.fromString(TREASURY_ADDRESS_V2_BLOCK))){
        treasury_address = TREASURY_ADDRESS_V2;
    }

    let daiBalance = daiERC20.balanceOf(Address.fromString(treasury_address))
    let adaiBalance = aDaiERC20.balanceOf(Address.fromString(AAVE_ALLOCATOR))
    let fraxBalance = fraxERC20.balanceOf(Address.fromString(treasury_address))
    let xSushiBalance = xSushiERC20.balanceOf(Address.fromString(treasury_address))
    let xSushi_value = toDecimal(xSushiBalance, 18).times(getXsushiUSDRate())
    let wethBalance = wethERC20.balanceOf(Address.fromString(treasury_address))
    let weth_value = toDecimal(wethBalance, 18).times(getETHUSDRate())
    let lusdBalance = BigInt.fromI32(0)
    if(transaction.blockNumber.gt(BigInt.fromString(LUSD_ERC20_CONTRACTV2_BLOCK))){
        lusdBalance = lusdERC20.balanceOf(Address.fromString(treasury_address))
    }

    //CONVEX
    // TODO add to mv and mvrfv
    let convexrfv =  BigDecimal.fromString("0");
    if(transaction.blockNumber.gt(BigInt.fromString(CONVEX_ALLOCATOR1_BLOCK))){
        let allocator1 = ConvexAllocator.bind(Address.fromString(CONVEX_ALLOCATOR1))
        convexrfv = convexrfv.plus(toDecimal(allocator1.totalValueDeployed(), 18))
    }
    if(transaction.blockNumber.gt(BigInt.fromString(CONVEX_ALLOCATOR2_BLOCK))){
        let allocator2 = ConvexAllocator.bind(Address.fromString(CONVEX_ALLOCATOR2))
        convexrfv = convexrfv.plus(toDecimal(allocator2.totalValueDeployed(), 18))
    }

    //PIDDAI
    let PIDdaiSushiBalance = PIDdaiPair.balanceOf(Address.fromString(treasury_address))
    let PIDdaiOnsenBalance = PIDdaiOnsenMC.userInfo(BigInt.fromI32(PIDDAI_ONSEN_ID), Address.fromString(ONSEN_ALLOCATOR)).value0
    let PIDdaiBalance = PIDdaiSushiBalance.plus(PIDdaiOnsenBalance)
    let PIDdaiTotalLP = toDecimal(PIDdaiPair.totalSupply(), 18)
    let PIDdaiPOL = toDecimal(PIDdaiBalance, 18).div(PIDdaiTotalLP).times(BigDecimal.fromString("100"))
    let PIDdai_value = getPairUSD(PIDdaiBalance, SUSHI_PIDDAI_PAIR)
    let PIDdai_rfv = getDiscountedPairUSD(PIDdaiBalance, SUSHI_PIDDAI_PAIR)

    //PIDFRAX
    let PIDfraxBalance = BigInt.fromI32(0)
    let PIDfrax_value = BigDecimal.fromString("0")
    let PIDfrax_rfv = BigDecimal.fromString("0")
    let PIDfraxTotalLP = BigDecimal.fromString("0")
    let PIDfraxPOL = BigDecimal.fromString("0")
    if(transaction.blockNumber.gt(BigInt.fromString(UNI_PIDFRAX_PAIR_BLOCK))){
        PIDfraxBalance = PIDfraxPair.balanceOf(Address.fromString(treasury_address))
        PIDfrax_value = getPairUSD(PIDfraxBalance, UNI_PIDFRAX_PAIR)
        PIDfrax_rfv = getDiscountedPairUSD(PIDfraxBalance, UNI_PIDFRAX_PAIR)
        PIDfraxTotalLP = toDecimal(PIDfraxPair.totalSupply(), 18)
        if (PIDfraxTotalLP.gt(BigDecimal.fromString("0")) &&  PIDfraxBalance.gt(BigInt.fromI32(0))){
            PIDfraxPOL = toDecimal(PIDfraxBalance, 18).div(PIDfraxTotalLP).times(BigDecimal.fromString("100"))
        }
    }

    //PIDLUSD
    let PIDlusdBalance = BigInt.fromI32(0)
    let PIDlusd_value = BigDecimal.fromString("0")
    let PIDlusd_rfv = BigDecimal.fromString("0")
    let PIDlusdTotalLP = BigDecimal.fromString("0")
    let PIDlusdPOL = BigDecimal.fromString("0")
    if(transaction.blockNumber.gt(BigInt.fromString(UNI_PIDLUSD_PAIR_BLOCK))){
        PIDlusdBalance = PIDlusdPair.balanceOf(Address.fromString(treasury_address))
        PIDlusd_value = getPairUSD(PIDlusdBalance, SUSHI_PIDLUSD_PAIR)
        PIDlusd_rfv = getDiscountedPairUSD(PIDlusdBalance, SUSHI_PIDLUSD_PAIR)
        PIDlusdTotalLP = toDecimal(PIDlusdPair.totalSupply(), 18)
        if (PIDlusdTotalLP.gt(BigDecimal.fromString("0")) &&  PIDlusdBalance.gt(BigInt.fromI32(0))){
            PIDlusdPOL = toDecimal(PIDlusdBalance, 18).div(PIDlusdTotalLP).times(BigDecimal.fromString("100"))
        }
    }

    let stableValue = daiBalance.plus(fraxBalance).plus(adaiBalance).plus(lusdBalance)
    let stableValueDecimal = toDecimal(stableValue, 18)

    let lpValue = PIDdai_value.plus(PIDfrax_value).plus(PIDlusd_value)
    let rfvLpValue = PIDdai_rfv.plus(PIDfrax_rfv).plus(PIDlusd_rfv)

    let mv = stableValueDecimal.plus(lpValue).plus(xSushi_value).plus(weth_value).plus(convexrfv)
    let rfv = stableValueDecimal.plus(rfvLpValue).plus(convexrfv)

    log.debug("Treasury Market Value {}", [mv.toString()])
    log.debug("Treasury RFV {}", [rfv.toString()])
    log.debug("Treasury DAI value {}", [toDecimal(daiBalance, 18).toString()])
    log.debug("Treasury aDAI value {}", [toDecimal(adaiBalance, 18).toString()])
    log.debug("Treasury xSushi value {}", [xSushi_value.toString()])
    log.debug("Treasury WETH value {}", [weth_value.toString()])
    log.debug("Treasury LUSD value {}", [toDecimal(lusdBalance, 18).toString()])
    log.debug("Treasury PID-DAI RFV {}", [PIDdai_rfv.toString()])
    log.debug("Treasury Frax value {}", [toDecimal(fraxBalance, 18).toString()])
    log.debug("Treasury PID-FRAX RFV {}", [PIDfrax_rfv.toString()])
    log.debug("Treasury PID-LUSD RFV {}", [PIDlusd_rfv.toString()])
    log.debug("Convex Allocator", [convexrfv.toString()])

    return [
        mv, 
        rfv,
        // treasuryDaiRiskFreeValue = DAI RFV * DAI + aDAI
        PIDdai_rfv.plus(toDecimal(daiBalance, 18)).plus(toDecimal(adaiBalance, 18)),
        // treasuryFraxRiskFreeValue = FRAX RFV * FRAX
        PIDfrax_rfv.plus(toDecimal(fraxBalance, 18)),
        // treasuryDaiMarketValue = DAI LP * DAI + aDAI
        PIDdai_value.plus(toDecimal(daiBalance, 18)).plus(toDecimal(adaiBalance, 18)),
        // treasuryFraxMarketValue = FRAX LP * FRAX
        PIDfrax_value.plus(toDecimal(fraxBalance, 18)),
        xSushi_value,
        weth_value,
        PIDlusd_rfv.plus(toDecimal(lusdBalance, 18)),
        PIDlusd_value.plus(toDecimal(lusdBalance, 18)),
        // POL
        PIDdaiPOL,
        PIDfraxPOL,
        PIDlusdPOL
    ]
}

function getNextPIDRebase(transaction: Transaction): BigDecimal{
    let next_distribution = BigDecimal.fromString("0")

    let staking_contract_v1 = OlympusStakingV1.bind(Address.fromString(STAKING_CONTRACT_V1))   
    let response = staking_contract_v1.try_PIDToDistributeNextEpoch()
    if(response.reverted==false){
        next_distribution = toDecimal(response.value,9)
        log.debug("next_distribution v1 {}", [next_distribution.toString()])
    }
    else{
        log.debug("reverted staking_contract_v1", []) 
    }

    if(transaction.blockNumber.gt(BigInt.fromString(STAKING_CONTRACT_V2_BLOCK))){
        let staking_contract_v2 = OlympusStakingV2.bind(Address.fromString(STAKING_CONTRACT_V2))
        let distribution_v2 = toDecimal(staking_contract_v2.epoch().value3,9)
        log.debug("next_distribution v2 {}", [distribution_v2.toString()])
        next_distribution = next_distribution.plus(distribution_v2)
    }

    log.debug("next_distribution total {}", [next_distribution.toString()])

    return next_distribution
}

function getAPY_Rebase(sPID: BigDecimal, distributedPID: BigDecimal): BigDecimal[]{
    let nextEpochRebase = distributedPID.div(sPID).times(BigDecimal.fromString("100"));

    let nextEpochRebase_number = Number.parseFloat(nextEpochRebase.toString())
    let currentAPY = Math.pow(((nextEpochRebase_number/100)+1), (365*3)-1)*100

    let currentAPYdecimal = BigDecimal.fromString(currentAPY.toString())

    log.debug("next_rebase {}", [nextEpochRebase.toString()])
    log.debug("current_apy total {}", [currentAPYdecimal.toString()])

    return [currentAPYdecimal, nextEpochRebase]
}

function getRunway(sPID: BigDecimal, rfv: BigDecimal, rebase: BigDecimal): BigDecimal[]{
    let runway2dot5k = BigDecimal.fromString("0")
    let runway5k = BigDecimal.fromString("0")
    let runway7dot5k = BigDecimal.fromString("0")
    let runway10k = BigDecimal.fromString("0")
    let runway20k = BigDecimal.fromString("0")
    let runway50k = BigDecimal.fromString("0")
    let runway70k = BigDecimal.fromString("0")
    let runway100k = BigDecimal.fromString("0")
    let runwayCurrent = BigDecimal.fromString("0")

    if(sPID.gt(BigDecimal.fromString("0")) && rfv.gt(BigDecimal.fromString("0")) &&  rebase.gt(BigDecimal.fromString("0"))){
        let treasury_runway = Number.parseFloat(rfv.div(sPID).toString())

        let runway2dot5k_num = (Math.log(treasury_runway) / Math.log(1+0.0029438))/3;
        let runway5k_num = (Math.log(treasury_runway) / Math.log(1+0.003579))/3;
        let runway7dot5k_num = (Math.log(treasury_runway) / Math.log(1+0.0039507))/3;
        let runway10k_num = (Math.log(treasury_runway) / Math.log(1+0.00421449))/3;
        let runway20k_num = (Math.log(treasury_runway) / Math.log(1+0.00485037))/3;
        let runway50k_num = (Math.log(treasury_runway) / Math.log(1+0.00569158))/3;
        let runway70k_num = (Math.log(treasury_runway) / Math.log(1+0.00600065))/3;
        let runway100k_num = (Math.log(treasury_runway) / Math.log(1+0.00632839))/3;
        let nextEpochRebase_number = Number.parseFloat(rebase.toString())/100
        let runwayCurrent_num = (Math.log(treasury_runway) / Math.log(1+nextEpochRebase_number))/3;

        runway2dot5k = BigDecimal.fromString(runway2dot5k_num.toString())
        runway5k = BigDecimal.fromString(runway5k_num.toString())
        runway7dot5k = BigDecimal.fromString(runway7dot5k_num.toString())
        runway10k = BigDecimal.fromString(runway10k_num.toString())
        runway20k = BigDecimal.fromString(runway20k_num.toString())
        runway50k = BigDecimal.fromString(runway50k_num.toString())
        runway70k = BigDecimal.fromString(runway70k_num.toString())
        runway100k = BigDecimal.fromString(runway100k_num.toString())
        runwayCurrent = BigDecimal.fromString(runwayCurrent_num.toString())
    }

    return [runway2dot5k, runway5k, runway7dot5k, runway10k, runway20k, runway50k, runway70k, runway100k, runwayCurrent]
}


export function updateProtocolMetrics(transaction: Transaction): void{
    let pm = loadOrCreateProtocolMetric(transaction.timestamp);

    //Total Supply
    pm.totalSupply = getTotalSupply()

    //Circ Supply
    pm.PIDCirculatingSupply = getCriculatingSupply(transaction, pm.totalSupply)

    //sPID Supply
    pm.sPIDCirculatingSupply = getSPIDSupply(transaction)

    //PID Price
    pm.PIDPrice = getPIDUSDRate()

    //PID Market Cap
    pm.marketCap = pm.PIDCirculatingSupply.times(pm.PIDPrice)

    //Total Value Locked
    pm.totalValueLocked = pm.sPIDCirculatingSupply.times(pm.PIDPrice)

    //Treasury RFV and MV
    let mv_rfv = getMV_RFV(transaction)
    pm.treasuryMarketValue = mv_rfv[0]
    pm.treasuryRiskFreeValue = mv_rfv[1]
    pm.treasuryDaiRiskFreeValue = mv_rfv[2]
    pm.treasuryFraxRiskFreeValue = mv_rfv[3]
    pm.treasuryDaiMarketValue = mv_rfv[4]
    pm.treasuryFraxMarketValue = mv_rfv[5]
    pm.treasuryXsushiMarketValue = mv_rfv[6]
    pm.treasuryWETHMarketValue = mv_rfv[7]
    pm.treasuryLusdRiskFreeValue = mv_rfv[8]
    pm.treasuryLusdMarketValue = mv_rfv[9]
    pm.treasuryPIDDaiPOL = mv_rfv[10]
    pm.treasuryPIDFraxPOL = mv_rfv[11]
    pm.treasuryPIDLusdPOL = mv_rfv[12]

    // Rebase rewards, APY, rebase
    pm.nextDistributedPID = getNextPIDRebase(transaction)
    let apy_rebase = getAPY_Rebase(pm.sPIDCirculatingSupply, pm.nextDistributedPID)
    pm.currentAPY = apy_rebase[0]
    pm.nextEpochRebase = apy_rebase[1]

    //Runway
    let runways = getRunway(pm.sPIDCirculatingSupply, pm.treasuryRiskFreeValue, pm.nextEpochRebase)
    pm.runway2dot5k = runways[0]
    pm.runway5k = runways[1]
    pm.runway7dot5k = runways[2]
    pm.runway10k = runways[3]
    pm.runway20k = runways[4]
    pm.runway50k = runways[5]
    pm.runway70k = runways[6]
    pm.runway100k = runways[7]
    pm.runwayCurrent = runways[8]

    //Holders
    pm.holders = getHolderAux().value
    
    pm.save()
    
    updateBondDiscounts(transaction)
}